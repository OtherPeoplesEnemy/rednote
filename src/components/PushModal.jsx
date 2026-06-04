import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

const SEV_COLOR = { Critical: '#a855f7', High: '#da3633', Medium: '#e3b341', Low: '#388bfd', Info: '#7d8590' }
const ENG_TYPES = ['Web App', 'Network', 'Red Team', 'Cloud', 'Mobile', 'Physical', 'Social Engineering', 'AI Red Team']

export default function PushModal({ project, findings, onClose }) {
  const [engagements, setEngagements] = useState([])
  const [selectedEng, setSelectedEng] = useState(project.redtrack_engagement_id || '')
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedFindings, setSelectedFindings] = useState(findings.map(f => f.id))
  const [showNewEng, setShowNewEng] = useState(false)
  const [creatingEng, setCreatingEng] = useState(false)
  const [newEng, setNewEng] = useState({ name: project.name, client: project.client, type: project.engagement_type || 'Web App' })

  useEffect(() => { loadEngagements() }, [])

  async function loadEngagements() {
    try {
      const engs = await invoke('fetch_redtrack_engagements')
      setEngagements(Array.isArray(engs) ? engs : [])
    } catch (e) {
      setError('Failed to load engagements. Check Settings → RedTrack connection.')
    } finally {
      setLoading(false)
    }
  }

  async function createEngagement() {
    if (!newEng.name || !newEng.client) { setError('Name and client are required'); return }
    setCreatingEng(true)
    setError(null)
    try {
      const result = await invoke('create_redtrack_engagement', {
        name: newEng.name,
        client: newEng.client,
        engagementType: newEng.type,
      })
      // Reload engagements and select the new one
      await loadEngagements()
      setSelectedEng(result.id)
      setShowNewEng(false)
    } catch (e) {
      setError(`Failed to create engagement: ${e}`)
    } finally {
      setCreatingEng(false)
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
          {result ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Push Complete</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2 }}>
                <div style={{ color: 'var(--green)' }}>✓ {result.pushed} findings created</div>
                <div style={{ color: 'var(--blue)' }}>↻ {result.updated} findings updated</div>
                {result.errors?.length > 0 && result.errors.map((e, i) => (
                  <div key={i} style={{ color: 'var(--red)' }}>✕ {e}</div>
                ))}
              </div>
              <button style={{ ...s.btnPrimary, marginTop: 16 }} onClick={onClose}>Done</button>
            </div>
          ) : loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading engagements...</div>
          ) : (
            <>
              {error && (
                <div style={{ color: 'var(--red)', fontSize: 11, background: 'rgba(218,54,51,.1)', border: '1px solid var(--red)', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                  {error}
                </div>
              )}

              {/* Engagement selector */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={s.label}>Target Engagement</label>
                  <button style={{ ...s.btn, fontSize: 10, padding: '3px 8px' }} onClick={() => setShowNewEng(!showNewEng)}>
                    {showNewEng ? '✕ Cancel' : '+ Create New'}
                  </button>
                </div>

                {showNewEng ? (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>New Engagement in RedTrack</div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={s.label}>Name *</label>
                      <input style={s.input} value={newEng.name} onChange={e => setNewEng({ ...newEng, name: e.target.value })} placeholder="Engagement name" />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={s.label}>Client *</label>
                      <input style={s.input} value={newEng.client} onChange={e => setNewEng({ ...newEng, client: e.target.value })} placeholder="Client name" />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={s.label}>Type</label>
                      <select style={s.input} value={newEng.type} onChange={e => setNewEng({ ...newEng, type: e.target.value })}>
                        {ENG_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <button style={s.btnPrimary} onClick={createEngagement} disabled={creatingEng}>
                      {creatingEng ? 'Creating...' : '+ Create Engagement'}
                    </button>
                  </div>
                ) : (
                  <select style={s.select} value={selectedEng} onChange={e => setSelectedEng(e.target.value)}>
                    <option value="">— Select engagement —</option>
                    {engagements.filter(e => e.status === 'Active' || e.status === 'active').map(e => (
                      <option key={e.id} value={e.id}>{e.ref_id} — {e.client} ({e.name})</option>
                    ))}
                    {engagements.filter(e => e.status !== 'Active' && e.status !== 'active').length > 0 && (
                      <optgroup label="Other">
                        {engagements.filter(e => e.status !== 'Active' && e.status !== 'active').map(e => (
                          <option key={e.id} value={e.id}>{e.ref_id} — {e.client}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              {/* Findings */}
              <div style={{ marginBottom: 16 }}>
                <div style={s.label}>Findings ({pendingFindings.length} new · {syncedFindings.length} already synced)</div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
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
                      No findings yet — create nodes with type "Finding"
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontSize: 10, color: 'var(--muted)', marginBottom: 16 }}>
                ℹ Already-synced findings will be updated, not duplicated.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={s.btn} onClick={onClose}>Cancel</button>
                <button style={s.btnPrimary} onClick={push}
                  disabled={pushing || !selectedEng || selectedFindings.length === 0}>
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
  input: { width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '7px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: 0 },
  select: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', cursor: 'pointer' },
  btn: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '7px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' },
  btnPrimary: { background: 'var(--red)', border: 'none', borderRadius: 5, color: '#fff', padding: '7px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 },
}
