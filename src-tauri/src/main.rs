#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

// ─── State ───────────────────────────────────────────────────────────────────

struct DbState(Mutex<Connection>);

// ─── Models ──────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Project {
    id: String,
    name: String,
    client: String,
    engagement_type: String,
    redtrack_engagement_id: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct TreeNode {
    id: String,
    project_id: String,
    parent_id: Option<String>,
    title: String,
    node_type: String, // note, finding, recon, screenshot, command
    content: String,
    icon: String,
    sort_order: i32,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Finding {
    id: String,
    project_id: String,
    node_id: String,
    title: String,
    severity: String,
    cvss_score: Option<f64>,
    cwe: Option<String>,
    cve: Option<String>,
    affected_component: Option<String>,
    description: String,
    impact: String,
    steps_to_reproduce: String,
    remediation: String,
    refs: String,
    status: String,
    redtrack_finding_id: Option<String>,
    pushed_at: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Config {
    redtrack_url: String,
    redtrack_api_key: String,
    theme: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct PushResult {
    pushed: i32,
    updated: i32,
    skipped: i32,
    errors: Vec<String>,
}

// ─── Database Setup ───────────────────────────────────────────────────────────

fn setup_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            client TEXT NOT NULL DEFAULT '',
            engagement_type TEXT NOT NULL DEFAULT 'Web App',
            redtrack_engagement_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tree_nodes (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            parent_id TEXT,
            title TEXT NOT NULL,
            node_type TEXT NOT NULL DEFAULT 'note',
            content TEXT NOT NULL DEFAULT '',
            icon TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS findings (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            node_id TEXT NOT NULL,
            title TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'Medium',
            cvss_score REAL,
            cwe TEXT,
            cve TEXT,
            affected_component TEXT,
            description TEXT NOT NULL DEFAULT '',
            impact TEXT NOT NULL DEFAULT '',
            steps_to_reproduce TEXT NOT NULL DEFAULT '',
            remediation TEXT NOT NULL DEFAULT '',
            refs TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Open',
            redtrack_finding_id TEXT,
            pushed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (node_id) REFERENCES tree_nodes(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS screenshots (
            id TEXT PRIMARY KEY,
            node_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL
        );"
    )?;
    Ok(())
}

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_config(state: State<DbState>) -> Config {
    let conn = state.0.lock().unwrap();
    let get = |key: &str, default: &str| -> String {
        conn.query_row(
            "SELECT value FROM config WHERE key = ?1",
            params![key],
            |row| row.get(0),
        ).unwrap_or_else(|_| default.to_string())
    };
    Config {
        redtrack_url: get("redtrack_url", ""),
        redtrack_api_key: get("redtrack_api_key", ""),
        theme: get("theme", "dark"),
    }
}

#[tauri::command]
fn save_config(config: Config, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pairs = [
        ("redtrack_url", &config.redtrack_url),
        ("redtrack_api_key", &config.redtrack_api_key),
        ("theme", &config.theme),
    ];
    for (key, value) in &pairs {
        conn.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
            params![key, value],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Projects ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn list_projects(state: State<DbState>) -> Vec<Project> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, client, engagement_type, redtrack_engagement_id, created_at, updated_at FROM projects ORDER BY updated_at DESC"
    ).unwrap();
    stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            client: row.get(2)?,
            engagement_type: row.get(3)?,
            redtrack_engagement_id: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).unwrap().filter_map(|r| r.ok()).collect()
}

#[tauri::command]
fn create_project(name: String, client: String, engagement_type: String, state: State<DbState>) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO projects (id, name, client, engagement_type, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, name, client, engagement_type, now, now],
    ).map_err(|e| e.to_string())?;

    // Create default tree structure
    let default_nodes = vec![
        ("Recon & OSINT", "recon", "🔍", 0),
        ("Findings", "findings_folder", "🐛", 1),
        ("Exploitation", "note", "🎯", 2),
        ("Screenshots", "note", "📸", 3),
        ("Tools & Commands", "note", "🔧", 4),
        ("Report Notes", "note", "📝", 5),
    ];
    
    for (title, node_type, icon, order) in default_nodes {
        let node_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tree_nodes (id, project_id, parent_id, title, node_type, content, icon, sort_order, created_at, updated_at) VALUES (?1, ?2, NULL, ?3, ?4, '', ?5, ?6, ?7, ?8)",
            params![node_id, id, title, node_type, icon, order, now, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(Project { id, name, client, engagement_type, redtrack_engagement_id: None, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
fn delete_project(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Tree Nodes ───────────────────────────────────────────────────────────────

#[tauri::command]
fn get_tree(project_id: String, state: State<DbState>) -> Vec<TreeNode> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, project_id, parent_id, title, node_type, content, icon, sort_order, created_at, updated_at FROM tree_nodes WHERE project_id = ?1 ORDER BY sort_order ASC, created_at ASC"
    ).unwrap();
    stmt.query_map(params![project_id], |row| {
        Ok(TreeNode {
            id: row.get(0)?,
            project_id: row.get(1)?,
            parent_id: row.get(2)?,
            title: row.get(3)?,
            node_type: row.get(4)?,
            content: row.get(5)?,
            icon: row.get(6)?,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).unwrap().filter_map(|r| r.ok()).collect()
}

#[tauri::command]
fn create_node(project_id: String, parent_id: Option<String>, title: String, node_type: String, icon: String, state: State<DbState>) -> Result<TreeNode, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO tree_nodes (id, project_id, parent_id, title, node_type, content, icon, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, '', ?6, 999, ?7, ?8)",
        params![id, project_id, parent_id, title, node_type, icon, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(TreeNode { id, project_id, parent_id, title, node_type, content: String::new(), icon, sort_order: 999, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
fn update_node(id: String, title: Option<String>, content: Option<String>, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    if let Some(t) = title {
        conn.execute("UPDATE tree_nodes SET title = ?1, updated_at = ?2 WHERE id = ?3", params![t, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(c) = content {
        conn.execute("UPDATE tree_nodes SET content = ?1, updated_at = ?2 WHERE id = ?3", params![c, now, id]).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn delete_node(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tree_nodes WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Findings ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_findings(project_id: String, state: State<DbState>) -> Vec<Finding> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, project_id, node_id, title, severity, cvss_score, cwe, cve, affected_component, description, impact, steps_to_reproduce, remediation, refs, status, redtrack_finding_id, pushed_at, created_at, updated_at FROM findings WHERE project_id = ?1 ORDER BY created_at DESC"
    ).unwrap();
    stmt.query_map(params![project_id], |row| {
        Ok(Finding {
            id: row.get(0)?,
            project_id: row.get(1)?,
            node_id: row.get(2)?,
            title: row.get(3)?,
            severity: row.get(4)?,
            cvss_score: row.get(5)?,
            cwe: row.get(6)?,
            cve: row.get(7)?,
            affected_component: row.get(8)?,
            description: row.get(9)?,
            impact: row.get(10)?,
            steps_to_reproduce: row.get(11)?,
            remediation: row.get(12)?,
            refs: row.get(13)?,
            status: row.get(14)?,
            redtrack_finding_id: row.get(15)?,
            pushed_at: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    }).unwrap().filter_map(|r| r.ok()).collect()
}

#[tauri::command]
fn save_finding(finding: Finding, state: State<DbState>) -> Result<Finding, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    
    // Check if exists
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM findings WHERE id = ?1",
        params![finding.id],
        |row| row.get::<_, i32>(0),
    ).unwrap_or(0) > 0;

    if exists {
        conn.execute(
            "UPDATE findings SET title=?1, severity=?2, cvss_score=?3, cwe=?4, cve=?5, affected_component=?6, description=?7, impact=?8, steps_to_reproduce=?9, remediation=?10, refs=?11, status=?12, updated_at=?13 WHERE id=?14",
            params![finding.title, finding.severity, finding.cvss_score, finding.cwe, finding.cve, finding.affected_component, finding.description, finding.impact, finding.steps_to_reproduce, finding.remediation, finding.refs, finding.status, now, finding.id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO findings (id, project_id, node_id, title, severity, cvss_score, cwe, cve, affected_component, description, impact, steps_to_reproduce, remediation, refs, status, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
            params![finding.id, finding.project_id, finding.node_id, finding.title, finding.severity, finding.cvss_score, finding.cwe, finding.cve, finding.affected_component, finding.description, finding.impact, finding.steps_to_reproduce, finding.remediation, finding.refs, finding.status, now, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(finding)
}

#[tauri::command]
fn delete_finding(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM findings WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── RedTrack Sync ────────────────────────────────────────────────────────────

#[tauri::command]
async fn push_to_redtrack(project_id: String, engagement_id: String, state: State<'_, DbState>) -> Result<PushResult, String> {
    let (findings, config) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(
            "SELECT id, project_id, node_id, title, severity, cvss_score, cwe, cve, affected_component, description, impact, steps_to_reproduce, remediation, refs, status, redtrack_finding_id, pushed_at, created_at, updated_at FROM findings WHERE project_id = ?1"
        ).map_err(|e| e.to_string())?;
        
        let findings: Vec<Finding> = stmt.query_map(params![project_id], |row| {
            Ok(Finding {
                id: row.get(0)?,
                project_id: row.get(1)?,
                node_id: row.get(2)?,
                title: row.get(3)?,
                severity: row.get(4)?,
                cvss_score: row.get(5)?,
                cwe: row.get(6)?,
                cve: row.get(7)?,
                affected_component: row.get(8)?,
                description: row.get(9)?,
                impact: row.get(10)?,
                steps_to_reproduce: row.get(11)?,
                remediation: row.get(12)?,
                refs: row.get(13)?,
                status: row.get(14)?,
                redtrack_finding_id: row.get(15)?,
                pushed_at: row.get(16)?,
                created_at: row.get(17)?,
                updated_at: row.get(18)?,
            })
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

        let get_config_val = |key: &str, default: &str| -> String {
            conn.query_row("SELECT value FROM config WHERE key = ?1", params![key], |row| row.get(0))
                .unwrap_or_else(|_| default.to_string())
        };

        let config = Config {
            redtrack_url: get_config_val("redtrack_url", ""),
            redtrack_api_key: get_config_val("redtrack_api_key", ""),
            theme: get_config_val("theme", "dark"),
        };

        (findings, config)
    };

    if config.redtrack_url.is_empty() || config.redtrack_api_key.is_empty() {
        return Err("RedTrack not configured. Go to Settings.".to_string());
    }

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let mut pushed = 0;
    let mut updated = 0;
    let skipped = 0;
    let mut errors = Vec::new();
    let mut updates_to_apply: Vec<(String, String)> = Vec::new();

    for finding in &findings {
        let payload = serde_json::json!({
            "title": finding.title,
            "severity": finding.severity.to_lowercase(),
            "cvss_score": finding.cvss_score,
            "cwe": finding.cwe,
            "cve": finding.cve,
            "affected_component": finding.affected_component,
            "description": finding.description,
            "impact": finding.impact,
            "steps_to_reproduce": finding.steps_to_reproduce,
            "remediation": finding.remediation,
            "references": finding.refs,
            "source": "rednote",
            "tags": ["rednote"],
        });

        // If already pushed, update
        if let Some(ref rt_id) = finding.redtrack_finding_id {
            let url = format!("{}/api/findings/{}", config.redtrack_url, rt_id);
            match client.patch(&url)
                .header("X-API-Key", &config.redtrack_api_key)
                .json(&payload)
                .send().await {
                Ok(r) if r.status().is_success() => { updated += 1; }
                Ok(r) => { errors.push(format!("{}: HTTP {}", finding.title, r.status())); }
                Err(e) => { errors.push(format!("{}: {}", finding.title, e)); }
            }
        } else {
            // New finding
            let url = format!("{}/api/findings/{}/create", config.redtrack_url, engagement_id);
            match client.post(&url)
                .header("X-API-Key", &config.redtrack_api_key)
                .json(&payload)
                .send().await {
                Ok(r) if r.status().is_success() => {
                    if let Ok(data) = r.json::<serde_json::Value>().await {
                        if let Some(rt_id) = data["id"].as_str() {
                            // Store for later DB update outside async context
                            updates_to_apply.push((finding.id.clone(), rt_id.to_string()));
                        }
                    }
                    pushed += 1;
                }
                Ok(r) => { errors.push(format!("{}: HTTP {}", finding.title, r.status())); }
                Err(e) => { errors.push(format!("{}: {}", finding.title, e)); }
            }
        }
    }

    // Apply DB updates after async operations complete
    if !updates_to_apply.is_empty() {
        if let Ok(conn) = state.0.lock() {
            let now = Utc::now().to_rfc3339();
            for (finding_id, rt_id) in updates_to_apply {
                conn.execute(
                    "UPDATE findings SET redtrack_finding_id = ?1, pushed_at = ?2 WHERE id = ?3",
                    params![rt_id, now, finding_id],
                ).ok();
            }
        }
    }

    Ok(PushResult { pushed, updated, skipped, errors })
}


#[tauri::command]
fn create_redtrack_engagement(name: String, client: String, engagement_type: String, state: State<DbState>) -> Result<serde_json::Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let url = conn.query_row("SELECT value FROM config WHERE key = 'redtrack_url'", [], |r| r.get::<_, String>(0)).unwrap_or_default();
    let key = conn.query_row("SELECT value FROM config WHERE key = 'redtrack_api_key'", [], |r| r.get::<_, String>(0)).unwrap_or_default();
    drop(conn);

    if url.is_empty() { return Err("RedTrack URL not configured".to_string()); }

    let client_http = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "name": name,
        "client": client,
        "type": engagement_type,
        "status": "Planning",
        "scope": "",
    });

    let resp = client_http.post(format!("{}/api/engagements/", url))
        .header("X-API-Key", key)
        .json(&payload)
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Failed to create engagement: HTTP {}", resp.status()));
    }

    resp.json::<serde_json::Value>().map_err(|e| e.to_string())
}

#[tauri::command]
fn fetch_redtrack_engagements(state: State<DbState>) -> Result<serde_json::Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let url = conn.query_row("SELECT value FROM config WHERE key = 'redtrack_url'", [], |r| r.get::<_, String>(0)).unwrap_or_default();
    let key = conn.query_row("SELECT value FROM config WHERE key = 'redtrack_api_key'", [], |r| r.get::<_, String>(0)).unwrap_or_default();
    drop(conn);

    if url.is_empty() { return Err("RedTrack URL not configured".to_string()); }

    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(format!("{}/api/engagements/", url))
        .header("X-API-Key", key)
        .send()
        .map_err(|e| e.to_string())?;

    resp.json::<serde_json::Value>().map_err(|e| e.to_string())
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    let home = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| "C:\\".to_string());
    
    let db_dir = std::path::PathBuf::from(&home).join("RedNote");
    std::fs::create_dir_all(&db_dir).unwrap_or(());
    let db_path = db_dir.join("rednote.db");

    let conn = match Connection::open(&db_path) {
        Ok(c) => c,
        Err(e) => panic!("DB failed: {}", e),
    };
    
    // Enable WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;").ok();
    
    setup_db(&conn).expect("Failed to setup database");

    tauri::Builder::default()
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            list_projects,
            create_project,
            delete_project,
            get_tree,
            create_node,
            update_node,
            delete_node,
            get_findings,
            save_finding,
            delete_finding,
            push_to_redtrack,
            fetch_redtrack_engagements,
            create_redtrack_engagement,
        ])
        .run(tauri::generate_context!())
        .expect("Error running RedNote");
}
