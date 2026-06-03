import { useState } from 'react'

const NODE_ICONS = {
  note: '📝',
  finding: '🐛',
  recon: '🔍',
  findings_folder: '🐛',
  command: '🔧',
  screenshot: '📸',
}

const SEV_COLOR = { Critical: '#a855f7', High: '#da3633', Medium: '#e3b341', Low: '#388bfd', Info: '#7d8590' }

export default function Sidebar({ tree, findings, selectedNode, onSelectNode, onCreateNode, onDeleteNode, onRenameNode }) {
  const [expanded, setExpanded] = useState({})
  const [renaming, setRenaming] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [showNewNode, setShowNewNode] = useState(null)
  const [newNodeTitle, setNewNodeTitle] = useState('')
  const [newNodeType, setNewNodeType] = useState('note')

  const roots = tree.filter(n => !n.parent_id)
  const children = (parentId) => tree.filter(n => n.parent_id === parentId)
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  function handleContextMenu(e, node) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  function closeContext() { setContextMenu(null) }

  function startRename(node) {
    setRenaming(node.id)
    setRenameVal(node.title)
    closeContext()
  }

  function finishRename(id) {
    if (renameVal.trim()) onRenameNode(id, renameVal.trim())
    setRenaming(null)
  }

  function getFindingForNode(nodeId) {
    return findings.find(f => f.node_id === nodeId)
  }

  function renderNode(node, depth = 0) {
    const kids = children(node.id)
    const isExpanded = expanded[node.id] !== false
    const isSelected = selectedNode?.id === node.id
    const finding = node.node_type === 'finding' ? getFindingForNode(node.id) : null

    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: `4px 8px 4px ${12 + depth * 16}px`,
            cursor: 'pointer', borderRadius: 4, margin: '1px 4px',
            background: isSelected ? 'var(--red-dim)' : 'transparent',
            borderLeft: isSelected ? '2px solid var(--red)' : '2px solid transparent',
          }}
          onClick={() => { onSelectNode(node); if (kids.length) toggleExpand(node.id) }}
          onContextMenu={e => handleContextMenu(e, node)}
        >
          {kids.length > 0 && (
            <span style={{ fontSize: 8, color: 'var(--muted2)', flexShrink: 0 }}>
              {isExpanded ? '▾' : '▸'}
            </span>
          )}
          {kids.length === 0 && <span style={{ width: 10, flexShrink: 0 }} />}

          <span style={{ fontSize: 12, flexShrink: 0 }}>{node.icon || NODE_ICONS[node.node_type] || '📝'}</span>

          {renaming === node.id ? (
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onBlur={() => finishRename(node.id)}
              onKeyDown={e => { if (e.key === 'Enter') finishRename(node.id); if (e.key === 'Escape') setRenaming(null) }}
              style={{ flex: 1, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 3, color: 'var(--text)', padding: '1px 4px', fontSize: 11 }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span style={{ flex: 1, fontSize: 11, color: isSelected ? 'var(--text)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.title}
            </span>
          )}

          {finding && (
            <span style={{ fontSize: 9, color: SEV_COLOR[finding.severity] || 'var(--muted)', flexShrink: 0, fontWeight: 700 }}>
              {finding.severity[0]}
            </span>
          )}
          {finding?.redtrack_finding_id && (
            <span style={{ fontSize: 9, color: 'var(--green)', flexShrink: 0 }} title="Synced to RedTrack">✓</span>
          )}
        </div>

        {isExpanded && kids.map(child => renderNode(child, depth + 1))}

        {showNewNode === node.id && (
          <div style={{ padding: `4px 8px 4px ${12 + (depth + 1) * 16}px`, display: 'flex', gap: 4 }}>
            <select value={newNodeType} onChange={e => setNewNodeType(e.target.value)}
              style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, fontSize: 10, padding: '2px' }}>
              <option value="note">📝 Note</option>
              <option value="finding">🐛 Finding</option>
              <option value="recon">🔍 Recon</option>
              <option value="command">🔧 Command</option>
            </select>
            <input autoFocus value={newNodeTitle} onChange={e => setNewNodeTitle(e.target.value)}
              placeholder="Node name..."
              onKeyDown={e => {
                if (e.key === 'Enter' && newNodeTitle.trim()) {
                  onCreateNode(node.id, newNodeTitle.trim(), newNodeType, NODE_ICONS[newNodeType])
                  setShowNewNode(null); setNewNodeTitle(''); setNewNodeType('note')
                }
                if (e.key === 'Escape') { setShowNewNode(null); setNewNodeTitle('') }
              }}
              style={{ flex: 1, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 3, color: 'var(--text)', padding: '2px 4px', fontSize: 11 }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={s.sidebar} onClick={closeContext}>
      {/* Header */}
      <div style={s.header}>
        <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Notes Tree
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={s.iconBtn} title="New root node"
            onClick={() => { setShowNewNode('root'); setNewNodeTitle('') }}>+</button>
        </div>
      </div>

      {/* New root node */}
      {showNewNode === 'root' && (
        <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
          <select value={newNodeType} onChange={e => setNewNodeType(e.target.value)}
            style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, fontSize: 10, padding: '2px' }}>
            <option value="note">📝 Note</option>
            <option value="finding">🐛 Finding</option>
            <option value="recon">🔍 Recon</option>
            <option value="command">🔧 Command</option>
          </select>
          <input autoFocus value={newNodeTitle} onChange={e => setNewNodeTitle(e.target.value)}
            placeholder="Node name..."
            onKeyDown={e => {
              if (e.key === 'Enter' && newNodeTitle.trim()) {
                onCreateNode(null, newNodeTitle.trim(), newNodeType, NODE_ICONS[newNodeType])
                setShowNewNode(null); setNewNodeTitle(''); setNewNodeType('note')
              }
              if (e.key === 'Escape') { setShowNewNode(null); setNewNodeTitle('') }
            }}
            style={{ flex: 1, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 3, color: 'var(--text)', padding: '2px 4px', fontSize: 11 }} />
        </div>
      )}

      {/* Tree */}
      <div style={s.tree}>
        {roots.map(node => renderNode(node))}
        {roots.length === 0 && (
          <div style={{ padding: 16, color: 'var(--muted2)', fontSize: 11, textAlign: 'center' }}>
            Right-click or press + to add nodes
          </div>
        )}
      </div>

      {/* Findings summary */}
      {findings.length > 0 && (
        <div style={s.findingsSummary}>
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
            Findings ({findings.length})
          </div>
          {['Critical', 'High', 'Medium', 'Low'].map(sev => {
            const count = findings.filter(f => f.severity === sev).length
            if (!count) return null
            return (
              <div key={sev} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: SEV_COLOR[sev] }}>{sev}</span>
                <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{count}</span>
              </div>
            )
          })}
          <div style={{ fontSize: 9, color: 'var(--green)', marginTop: 4 }}>
            {findings.filter(f => f.redtrack_finding_id).length}/{findings.length} synced
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, padding: '4px 0', zIndex: 1000, minWidth: 160 }}>
          {[
            ['Add child node', () => { setShowNewNode(contextMenu.node.id); closeContext() }],
            ['Rename', () => startRename(contextMenu.node)],
            ['Delete', () => { if (confirm(`Delete "${contextMenu.node.title}"?`)) { onDeleteNode(contextMenu.node.id); closeContext() } }],
          ].map(([label, action]) => (
            <div key={label} onClick={action}
              style={{ padding: '6px 14px', cursor: 'pointer', fontSize: 11, color: label === 'Delete' ? 'var(--red)' : 'var(--text)' }}
              onMouseEnter={e => e.target.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  sidebar: { width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 },
  header: { padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  tree: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  iconBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', borderRadius: 3 },
  findingsSummary: { padding: 12, borderTop: '1px solid var(--border)', background: 'var(--surface2)' },
}
