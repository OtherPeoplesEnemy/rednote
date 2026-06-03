import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import NoteEditor from './NoteEditor'
import FindingEditor from './FindingEditor'

export default function Editor({ node, finding, project, onUpdateNode, onSaveFinding, onDeleteFinding }) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  if (!node) {
    return (
      <div style={s.empty}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>📝</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Select a node to edit</div>
        <div style={{ fontSize: 11, color: 'var(--muted2)' }}>Or right-click the sidebar to create a new node</div>
      </div>
    )
  }

  async function handleContentChange(content) {
    setSaving(true)
    await onUpdateNode(node.id, content)
    setSaving(false)
    setLastSaved(new Date())
  }

  async function handleSaveFinding(findingData) {
    setSaving(true)
    const f = {
      id: finding?.id || uuidv4(),
      project_id: project.id,
      node_id: node.id,
      ...findingData,
      redtrack_finding_id: finding?.redtrack_finding_id || null,
      pushed_at: finding?.pushed_at || null,
      created_at: finding?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await onSaveFinding(f)
    setSaving(false)
    setLastSaved(new Date())
  }

  return (
    <div style={s.editor}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{node.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{node.title}</span>
          <span style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {node.node_type}
          </span>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 10, color: 'var(--muted)' }}>Saving...</span>}
          {lastSaved && !saving && (
            <span style={{ fontSize: 10, color: 'var(--muted2)' }}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {finding?.redtrack_finding_id && (
            <span style={{ fontSize: 10, color: 'var(--green)', padding: '2px 8px', border: '1px solid var(--green)', borderRadius: 4 }}>
              ✓ Synced to RedTrack
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>
        {node.node_type === 'finding' ? (
          <FindingEditor
            finding={finding}
            node={node}
            onSave={handleSaveFinding}
            onDelete={finding ? () => onDeleteFinding(finding.id) : null}
          />
        ) : (
          <NoteEditor
            key={node.id}
            node={node}
            onChange={handleContentChange}
          />
        )}
      </div>
    </div>
  )
}

const s = {
  editor: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' },
  header: { padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexShrink: 0 },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
}
