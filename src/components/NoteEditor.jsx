import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function NoteEditor({ node, onChange }) {
  const [content, setContent] = useState(node.content || '')
  const [mode, setMode] = useState('split')
  const saveTimer = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setContent(node.content || '')
  }, [node.id])

  const handleChange = useCallback((val) => {
    setContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onChange(val)
    }, 800)
  }, [onChange])

  function insertText(before, after = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end)
    const newText = before + (selected || 'text') + after
    const newContent = content.slice(0, start) + newText + content.slice(end)
    handleChange(newContent)
    setTimeout(() => {
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + (selected || 'text').length
      ta.focus()
    }, 0)
  }

  const toolbarBtns = [
    { label: 'B', action: () => insertText('**', '**'), title: 'Bold' },
    { label: 'I', action: () => insertText('_', '_'), title: 'Italic' },
    { label: '`', action: () => insertText('`', '`'), title: 'Code' },
    { label: '```', action: () => insertText('\n```\n', '\n```\n'), title: 'Code block' },
    { label: '#', action: () => insertText('## '), title: 'Heading' },
    { label: '—', action: () => insertText('\n---\n'), title: 'Divider' },
    { label: '•', action: () => insertText('\n- '), title: 'List' },
    { label: '[ ]', action: () => insertText('\n- [ ] '), title: 'Checkbox' },
    { label: '⚑', action: () => insertText('\n> ⚑ **NOTE:** '), title: 'Note callout' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={{ display: 'flex', gap: 2 }}>
          {toolbarBtns.map(btn => (
            <button key={btn.label} title={btn.title} style={s.toolBtn} onClick={btn.action}>
              {btn.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {['edit', 'split', 'preview'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ ...s.toolBtn, background: mode === m ? 'var(--red-dim)' : 'transparent', color: mode === m ? 'var(--red)' : 'var(--muted)' }}>
              {m === 'edit' ? '✎' : m === 'split' ? '⊞' : '👁'}
            </button>
          ))}
        </div>
      </div>

      {/* Editor + Preview */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            ref={textareaRef}
            className="selectable"
            style={{
              flex: mode === 'split' ? '0 0 50%' : 1,
              background: 'var(--bg)',
              border: 'none',
              borderRight: mode === 'split' ? '1px solid var(--border)' : 'none',
              color: 'var(--text)',
              padding: 16,
              fontSize: 13,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              resize: 'none',
              outline: 'none',
              lineHeight: 1.7,
            }}
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Start writing in markdown..."
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="selectable" style={{ flex: mode === 'split' ? '0 0 50%' : 1, padding: 20, overflowY: 'auto', background: 'var(--surface)', ...mdStyles }}>
            {content ? (
              <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
            ) : (
              <div style={{ color: 'var(--muted2)', fontSize: 12, fontStyle: 'italic' }}>Nothing to preview</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const mdStyles = { fontSize: 13, lineHeight: 1.7 }

const mdComponents = {
  code: ({ inline, children }) => inline
    ? <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace', fontSize: '0.9em', color: 'var(--green)' }}>{children}</code>
    : <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, overflow: 'auto', margin: '10px 0' }}>
        <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--green)' }}>{children}</code>
      </pre>,
  h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 20 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8, marginTop: 16 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6, marginTop: 12 }}>{children}</h3>,
  p: ({ children }) => <p style={{ marginBottom: 10, color: 'var(--text)', lineHeight: 1.7 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4, color: 'var(--text)' }}>{children}</li>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--red)', paddingLeft: 12, color: 'var(--muted)', margin: '10px 0', fontStyle: 'italic' }}>{children}</blockquote>,
  strong: ({ children }) => <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</strong>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />,
  a: ({ href, children }) => <a href={href} style={{ color: 'var(--blue)', textDecoration: 'none' }} target="_blank" rel="noreferrer">{children}</a>,
  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 12 }}>{children}</table>,
  th: ({ children }) => <th style={{ padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', textAlign: 'left', fontWeight: 700 }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: '6px 10px', border: '1px solid var(--border)', color: 'var(--text)' }}>{children}</td>,
  img: ({ src, alt }) => <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid var(--border)', margin: '8px 0' }} />,
}

const s = {
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  toolBtn: { background: 'none', border: '1px solid transparent', borderRadius: 3, color: 'var(--muted)', padding: '2px 6px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600 },
}
