import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import TitleBar from './components/TitleBar'
import ProjectSelector from './components/ProjectSelector'
import Settings from './components/Settings'
import PushModal from './components/PushModal'

export default function App() {
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [tree, setTree] = useState([])
  const [findings, setFindings] = useState([])
  const [view, setView] = useState('projects') // projects | editor | settings
  const [showPush, setShowPush] = useState(false)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    loadProjects()
    loadConfig()
  }, [])

  useEffect(() => {
    if (activeProject) {
      loadTree(activeProject.id)
      loadFindings(activeProject.id)
    }
  }, [activeProject])

  async function loadProjects() {
    const p = await invoke('list_projects')
    setProjects(p)
  }

  async function loadConfig() {
    const c = await invoke('get_config')
    setConfig(c)
  }

  async function loadTree(projectId) {
    const t = await invoke('get_tree', { projectId })
    setTree(t)
  }

  async function loadFindings(projectId) {
    const f = await invoke('get_findings', { projectId })
    setFindings(f)
  }

  async function createProject(name, client, engagementType) {
    const p = await invoke('create_project', { name, client, engagementType })
    setProjects(prev => [p, ...prev])
    setActiveProject(p)
    setView('editor')
  }

  async function deleteProject(id) {
    await invoke('delete_project', { id })
    setProjects(prev => prev.filter(p => p.id !== id))
    if (activeProject?.id === id) {
      setActiveProject(null)
      setView('projects')
    }
  }

  async function createNode(parentId, title, nodeType, icon) {
    const node = await invoke('create_node', {
      projectId: activeProject.id,
      parentId: parentId || null,
      title,
      nodeType,
      icon,
    })
    setTree(prev => [...prev, node])
    setSelectedNode(node)
  }

  async function updateNode(id, title, content) {
    await invoke('update_node', { id, title: title || null, content: content || null })
    setTree(prev => prev.map(n => n.id === id ? { ...n, title: title ?? n.title, content: content ?? n.content } : n))
  }

  async function deleteNode(id) {
    await invoke('delete_node', { id })
    setTree(prev => prev.filter(n => n.id !== id && n.parent_id !== id))
    if (selectedNode?.id === id) setSelectedNode(null)
  }

  async function saveFinding(finding) {
    const saved = await invoke('save_finding', { finding })
    setFindings(prev => {
      const exists = prev.find(f => f.id === saved.id)
      if (exists) return prev.map(f => f.id === saved.id ? saved : f)
      return [saved, ...prev]
    })
    return saved
  }

  async function deleteFinding(id) {
    await invoke('delete_finding', { id })
    setFindings(prev => prev.filter(f => f.id !== id))
  }

  const findingForNode = (nodeId) => findings.find(f => f.node_id === nodeId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TitleBar
        project={activeProject}
        onBack={() => { setActiveProject(null); setView('projects') }}
        onSettings={() => setView(view === 'settings' ? (activeProject ? 'editor' : 'projects') : 'settings')}
        onPush={() => setShowPush(true)}
        showBack={view === 'editor'}
        showPush={view === 'editor' && findings.length > 0}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'projects' && (
          <ProjectSelector
            projects={projects}
            onCreate={createProject}
            onOpen={(p) => { setActiveProject(p); setView('editor') }}
            onDelete={deleteProject}
          />
        )}

        {view === 'editor' && activeProject && (
          <>
            <Sidebar
              tree={tree}
              findings={findings}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onCreateNode={createNode}
              onDeleteNode={deleteNode}
              onRenameNode={(id, title) => updateNode(id, title, null)}
            />
            <Editor
              node={selectedNode}
              finding={selectedNode ? findingForNode(selectedNode.id) : null}
              project={activeProject}
              onUpdateNode={(id, content) => updateNode(id, null, content)}
              onSaveFinding={saveFinding}
              onDeleteFinding={deleteFinding}
            />
          </>
        )}

        {view === 'settings' && (
          <Settings config={config} onSave={async (c) => { await invoke('save_config', { config: c }); setConfig(c); setView(activeProject ? 'editor' : 'projects') }} />
        )}
      </div>

      {showPush && activeProject && (
        <PushModal
          project={activeProject}
          findings={findings}
          onClose={() => setShowPush(false)}
        />
      )}
    </div>
  )
}
