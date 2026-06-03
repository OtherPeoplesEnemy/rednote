import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

const SEV_COLOR = { Critical: '#a855f7', High: '#da3633', Medium: '#e3b341', Low: '#388bfd', Info: '#7d8590' }

export default function PushModal({ project, findings, onClose }) {
  const [engagements, setEngagements] = useState([])
  const [selectedEng, setSelectedEng] = useState(project.redtrack_engagement_id || '')
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedFindings, setSelectedFindings] = useState(findings.map(f => f.id))

  useEffect(() => {
    loadEngagements()
  }, [])

  async function loadEngagements() {
    try {
      const engs = await invoke('fetch_redtrack_engagements')
      setEngagements(Array.isArray(engs) ? engs : [])
      if (Array.isArray(engs) && engs.length > 0 && !selectedEng) {
        setSelectedEng(engs[0].id)
      }
    } catch (e) {
      setError('Failed to load engagements. Check your RedTrack connection in Settings.')
    } finally {
      setLoading(false)
    }
  }

  async function push() {
    if (!selectedEng) { setError('Please select an engagement'); return }
    setPushing(true)
    setError(null)
    try {
      const res = await invoke('push_to_redtrack', { projectId: project.id, engagementId: selectedEng })
      setResult(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setPushing(false)
    }
  }

  function toggleFinding(id) {
    setSelectedFindings(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  const pendingFindings = findings.filter(f => !f.redtrack_finding_id)
  const syncedFindings = findings.filter(f => f.redtrack_finding_id)

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.title}>↑ Push to RedTrack</div>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading engagements...</div>
          ) : error && !result ? (
            <div style={{ color: 'var(--red)', fontSize: 11, background: 'rgba(218,54,51,.1)', border: '1px solid var(--red)', borderRadius: 6, padding: 12, marginBottom: 16 }}>
              {error}
            </div>
          ) : result ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Push Complete</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2 }}>
                <div style={{ color: 'var(--green)' }}>✓ {result.pushed} findings created</div>
                <div style={{ color: 'var(--blue)' }}>↻ {result.updated} findings updated</div>
                {result.errors.length > 0 && (
                  <div style={{ color: 'var(--red)', marginTop: 8 }}>
                    {result.errors.map((e, i) => <div key={i}>✕ {e}</div>)}
                  </div>
                )}
              </div>
              <button style={{ ...s.btnPrimary, marginTop: 16 }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              {/* Engagement selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Target Engagement</label>
                <select style={s.select} value={selectedEng} onChange={e => setSelectedEng(e.target.value)}>
                  <option value="">— Select engagement —</option>
                  {engagements.filter(e => e.status === 'Active' || e.status === 'active').map(e => (
                    <option key={e.id} value={e.id}>{e.ref_id} — {e.client} ({e.name})</option>
                  ))}
                  {engagements.filter(e => e.status !== 'Active' && e.status !== 'active').length > 0 && (
                    <optgroup label="Other engagements">
                      {engagements.filter(e => e.status !== 'Active' && e.status !== 'active').map(e => (
                        <option key={e.id} value={e.id}>{e.ref_id} — {e.client}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Findings to push */}
              <div style={{ marginBottom: 16 }}>
                <div style={s.label}>Findings ({pendingFindings.length} new, {syncedFindings.length} already synced)</div>
                <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                  {findings.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border2)' }}>
                      <input type="checkbox" checked={selectedFindings.includes(f.id)} onChange={() => toggleFinding(f.id)} style={{ cursor: 'pointer' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: SEV_COLOR[f.severity] || 'var(--muted)', width: 60, flexShrink: 0 }}>{f.severity}</span>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{f.title}</span>
                      {f.redtrack_finding_id && <span style={{ fontSize: 9, color: 'var(--green)' }}>✓ synced</span>}
                    </div>
                  ))}
                  {findings.length === 0 && (
                    <div style={{ padding: 16, color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>
                      No findings to push. Create findings by adding nodes with type "Finding".
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontSize: 10, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
                ℹ Already-synced findings will be updated, not duplicated.<br />
                New findings will be created in the selected engagement.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={s.btn} onClick={onClose}>Cancel</button>
                <button style={s.btnPrimary} onClick={push} disabled={pushing || !selectedEng || selectedFindings.length === 0}>
                  {pushing ? 'Pushing...' : `↑ Push ${selectedFindings.length} Finding${selectedFindings.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, width: '90%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' },
  header: { padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 22 },
  label: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6, fontWeight: 700 },
  select: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', cursor: 'pointer' },
  btn: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '7px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' },
  btnPrimary: { background: 'var(--red)', border: 'none', borderRadius: 5, color: '#fff', padding: '7px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 },
}
