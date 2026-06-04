import { useState, useEffect } from 'react'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info']
const SEV_COLOR = { Critical: '#a855f7', High: '#da3633', Medium: '#e3b341', Low: '#388bfd', Info: '#7d8590' }
const SEV_DIM = { Critical: 'rgba(168,85,247,.15)', High: 'rgba(218,54,51,.15)', Medium: 'rgba(227,179,65,.15)', Low: 'rgba(56,139,253,.15)', Info: 'rgba(125,133,144,.15)' }

const STATUSES = ['Open', 'In Review', 'Remediated', 'Accepted', 'False Positive']

export default function FindingEditor({ finding, node, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: node?.title || '',
    severity: 'High',
    cvss_score: '',
    cwe: '',
    cve: '',
    affected_component: '',
    description: '',
    impact: '',
    steps_to_reproduce: '',
    remediation: '',
    refs: '',
    status: 'Open',
  })
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    if (finding) {
      setForm({
        title: finding.title || node?.title || '',
        severity: finding.severity || 'High',
        cvss_score: finding.cvss_score || '',
        cwe: finding.cwe || '',
        cve: finding.cve || '',
        affected_component: finding.affected_component || '',
        description: finding.description || '',
        impact: finding.impact || '',
        steps_to_reproduce: finding.steps_to_reproduce || '',
        remediation: finding.remediation || '',
        refs: finding.refs || '',
        status: finding.status || 'Open',
      })
    }
  }, [finding?.id, node?.id])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  async function save() {
    await onSave({ ...form, cvss_score: form.cvss_score ? parseFloat(form.cvss_score) : null })
    setDirty(false)
  }

  const sev = form.severity
  const tabs = ['details', 'description', 'steps', 'remediation']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Severity banner */}
      <div style={{ background: SEV_DIM[sev], borderBottom: `2px solid ${SEV_COLOR[sev]}44`, padding: '8px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SEVERITIES.map(s => (
            <button key={s} onClick={() => update('severity', s)}
              style={{ border: `1px solid ${s === sev ? SEV_COLOR[s] : 'var(--border)'}`, borderRadius: 4, padding: '3px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: s === sev ? SEV_DIM[s] : 'transparent', color: s === sev ? SEV_COLOR[s] : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {s}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <select value={form.status} onChange={e => update('status', e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {dirty && (
            <button style={s.saveBtn} onClick={save}>💾 Save</button>
          )}
          {finding && !dirty && (
            <button style={s.saveBtn} onClick={save}>💾 Save</button>
          )}
          {!finding && (
            <button style={s.saveBtn} onClick={save}>💾 Create Finding</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 14px', fontSize: 11, border: 'none', cursor: 'pointer', background: 'transparent', color: activeTab === tab ? 'var(--red)' : 'var(--muted)', borderBottom: activeTab === tab ? '2px solid var(--red)' : '2px solid transparent', fontFamily: 'monospace' }}>
            {tab === 'details' ? '📋 Details' : tab === 'description' ? '📄 Description' : tab === 'steps' ? '🔍 Steps to Reproduce' : '🔧 Remediation'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="selectable">
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={s.label}>Title</label>
              <input style={s.input} value={form.title} onChange={e => update('title', e.target.value)} placeholder="Finding title..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>CVSS Score</label>
                <input style={s.input} type="number" min="0" max="10" step="0.1" value={form.cvss_score} onChange={e => update('cvss_score', e.target.value)} placeholder="0.0 – 10.0" />
              </div>
              <div>
                <label style={s.label}>CWE</label>
                <input style={s.input} value={form.cwe} onChange={e => update('cwe', e.target.value)} placeholder="CWE-89" />
              </div>
              <div>
                <label style={s.label}>CVE</label>
                <input style={s.input} value={form.cve} onChange={e => update('cve', e.target.value)} placeholder="CVE-2024-..." />
              </div>
            </div>
            <div>
              <label style={s.label}>Affected Component</label>
              <input style={s.input} value={form.affected_component} onChange={e => update('affected_component', e.target.value)} placeholder="e.g. /api/login, 192.168.1.1:445" />
            </div>
            <div>
              <label style={s.label}>References</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={form.refs} onChange={e => update('refs', e.target.value)} placeholder="CVE links, advisories, writeups..." />
            </div>
            {finding?.redtrack_finding_id && (
              <div style={{ background: 'rgba(63,185,80,.1)', border: '1px solid var(--green)', borderRadius: 6, padding: 10, fontSize: 11, color: 'var(--green)' }}>
                ✓ Synced to RedTrack — ID: {finding.redtrack_finding_id.slice(0, 8)}...
                {finding.pushed_at && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>Last pushed: {finding.pushed_at.slice(0, 10)}</span>}
              </div>
            )}
            {onDelete && (
              <button style={{ background: 'none', border: '1px solid var(--red)', borderRadius: 5, color: 'var(--red)', padding: '6px 14px', fontSize: 11, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 8 }}
                onClick={() => { if (confirm('Delete this finding?')) onDelete() }}>
                Delete Finding
              </button>
            )}
          </div>
        )}

        {activeTab === 'description' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.label}>Description</label>
              <textarea className="selectable" style={{ ...s.input, minHeight: 150, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }}
                value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="Describe the vulnerability in detail..." />
            </div>
            <div>
              <label style={s.label}>Impact</label>
              <textarea className="selectable" style={{ ...s.input, minHeight: 100, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }}
                value={form.impact} onChange={e => update('impact', e.target.value)}
                placeholder="What is the business impact if exploited?" />
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <div>
            <label style={s.label}>Steps to Reproduce</label>
            <textarea className="selectable" style={{ ...s.input, minHeight: 400, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.7 }}
              value={form.steps_to_reproduce} onChange={e => update('steps_to_reproduce', e.target.value)}
              placeholder={`1. Navigate to the login page\n2. Enter payload in the username field\n3. Observe the SQL error...\n\nSupports markdown`} />
          </div>
        )}

        {activeTab === 'remediation' && (
          <div>
            <label style={s.label}>Remediation</label>
            <textarea className="selectable" style={{ ...s.input, minHeight: 400, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.7 }}
              value={form.remediation} onChange={e => update('remediation', e.target.value)}
              placeholder="How to fix this vulnerability..." />
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  label: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5, fontWeight: 700 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  saveBtn: { background: 'var(--red)', border: 'none', borderRadius: 4, color: '#fff', padding: '4px 12px', fontSize: 10, cursor: 'pointer', fontWeight: 700 },
}
