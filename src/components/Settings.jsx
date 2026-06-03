import { useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

export default function Settings({ config, onSave }) {
  const [form, setForm] = useState(config || { redtrack_url: '', redtrack_api_key: '', theme: 'dark' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      await invoke('save_config', { config: form })
      const engs = await invoke('fetch_redtrack_engagements')
      setTestResult({ ok: true, msg: `Connected! Found ${Array.isArray(engs) ? engs.length : 0} engagements.` })
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>⚙ Settings</div>

        <div style={s.section}>
          <div style={s.sectionTitle}>RedTrack Connection</div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>RedTrack Server URL</label>
            <input style={s.input} value={form.redtrack_url} onChange={e => setForm({ ...form, redtrack_url: e.target.value })}
              placeholder="https://192.168.0.48 or https://redtrack.yourcompany.com" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>API Key</label>
            <input style={s.input} type="password" value={form.redtrack_api_key} onChange={e => setForm({ ...form, redtrack_api_key: e.target.value })}
              placeholder="Get from RedTrack → Settings → API Key" />
            <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 5 }}>
              In RedTrack: Settings → My Profile → Generate API Key
            </div>
          </div>
          {testResult && (
            <div style={{ background: testResult.ok ? 'rgba(63,185,80,.1)' : 'rgba(218,54,51,.1)', border: `1px solid ${testResult.ok ? 'var(--green)' : 'var(--red)'}`, borderRadius: 6, padding: '8px 12px', fontSize: 11, color: testResult.ok ? 'var(--green)' : 'var(--red)', marginBottom: 12 }}>
              {testResult.ok ? '✓ ' : '✕ '}{testResult.msg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btn} onClick={testConnection} disabled={testing}>
              {testing ? 'Testing...' : '🔗 Test Connection'}
            </button>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Appearance</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['dark', 'light'].map(t => (
              <button key={t} onClick={() => setForm({ ...form, theme: t })}
                style={{ ...s.btn, background: form.theme === t ? 'var(--red-dim)' : 'var(--surface2)', color: form.theme === t ? 'var(--red)' : 'var(--muted)', borderColor: form.theme === t ? 'var(--red)' : 'var(--border)' }}>
                {t === 'dark' ? '◑ Dark' : '☀ Light'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button style={s.btnPrimary} onClick={() => onSave(form)}>Save Settings</button>
        </div>
      </div>

      <div style={{ ...s.card, marginTop: 0 }}>
        <div style={s.sectionTitle}>About RedNote</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
          <div>Version: 1.0.0</div>
          <div>RedNote stores all data locally in a SQLite database.</div>
          <div style={{ marginTop: 8, color: 'var(--muted2)' }}>
            Database location: AppData/RedNote/rednote.db
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, padding: 40, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: '100%', maxWidth: 540 },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 },
  section: { marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' },
  sectionTitle: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, fontWeight: 700 },
  label: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' },
  btn: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--text)', padding: '7px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' },
  btnPrimary: { background: 'var(--red)', border: 'none', borderRadius: 5, color: '#fff', padding: '7px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 },
}
