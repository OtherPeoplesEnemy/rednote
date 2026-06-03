import { useState } from 'react'

const ENG_TYPES = ['Web App', 'Network', 'Red Team', 'Cloud', 'Mobile', 'Physical', 'Social Engineering', 'AI Red Team']

export default function ProjectSelector({ projects, onCreate, onOpen, onDelete }) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', client: '', type: 'Web App' })

  function handleCreate() {
    if (!form.name.trim()) return
    onCreate(form.name.trim(), form.client.trim(), form.type)
    setForm({ name: '', client: '', type: 'Web App' })
    setShowNew(false)
  }

  return (
    <div style={s.page}>
      {/* Logo */}
      <div style={s.hero}>
        <div style={s.logo}>
          <span style={{ color: 'var(--red)' }}>RED</span>NOTE
        </div>
        <div style={s.tagline}>Offline pentest notes · Push to RedTrack when ready</div>
      </div>

      {/* New project */}
      {showNew ? (
        <div style={s.card}>
          <div style={s.cardTitle}>New Pentest Project</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.label}>Project Name *</label>
              <input style={s.input} autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. ACME Corp Web App Pentest" />
            </div>
            <div>
              <label style={s.label}>Client</label>
              <input style={s.input} value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}
                placeholder="e.g. ACME Corporation" />
            </div>
            <div>
              <label style={s.label}>Engagement Type</label>
              <select style={s.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {ENG_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button style={s.btn} onClick={() => setShowNew(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={handleCreate} disabled={!form.name.trim()}>
                Create Project
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button style={s.newBtn} onClick={() => setShowNew(true)}>
          + New Pentest Project
        </button>
      )}

      {/* Recent projects */}
      {projects.length > 0 && (
        <div style={s.projectList}>
          <div style={s.sectionTitle}>Recent Projects</div>
          {projects.map(p => (
            <div key={p.id} style={s.projectRow}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onOpen(p)}>
                <div style={s.projectName}>{p.name}</div>
                <div style={s.projectMeta}>
                  {p.client && <span>{p.client}</span>}
                  {p.client && <span style={{ color: 'var(--muted2)' }}>·</span>}
                  <span>{p.engagement_type}</span>
                  <span style={{ color: 'var(--muted2)' }}>·</span>
                  <span>{p.updated_at.slice(0, 10)}</span>
                  {p.redtrack_engagement_id && (
                    <span style={{ color: 'var(--green)', marginLeft: 4 }}>✓ Linked to RedTrack</span>
                  )}
                </div>
              </div>
              <button style={s.openBtn} onClick={() => onOpen(p)}>Open →</button>
              <button style={s.delBtn} onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) onDelete(p.id) }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 && !showNew && (
        <div style={s.empty}>
          <div style={{ fontSize: 11, color: 'var(--muted2)' }}>No projects yet — create your first pentest project above</div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 40, overflowY: 'auto' },
  hero: { textAlign: 'center', marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: 900, letterSpacing: '.05em', marginBottom: 8 },
  tagline: { fontSize: 12, color: 'var(--muted)', letterSpacing: '.05em' },
  card: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, padding: 24, width: '100%', maxWidth: 480, marginBottom: 24 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  newBtn: { background: 'var(--red)', border: 'none', borderRadius: 6, color: '#fff', padding: '10px 24px', fontSize: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace', marginBottom: 32 },
  label: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' },
  btn: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '7px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' },
  btnPrimary: { background: 'var(--red)', border: 'none', borderRadius: 5, color: '#fff', padding: '7px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 },
  projectList: { width: '100%', maxWidth: 600 },
  sectionTitle: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 },
  projectRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 },
  projectName: { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 },
  projectMeta: { display: 'flex', gap: 6, fontSize: 10, color: 'var(--muted)', alignItems: 'center' },
  openBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' },
  delBtn: { background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' },
  empty: { marginTop: 20 },
}
