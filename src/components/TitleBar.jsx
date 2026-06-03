import { appWindow } from '@tauri-apps/api/window'

export default function TitleBar({ project, onBack, onSettings, onPush, showBack, showPush }) {
  return (
    <div data-tauri-drag-region style={s.bar}>
      <div style={s.left}>
        <div style={s.logo}>
          <span style={{ color: 'var(--red)', fontWeight: 900 }}>RED</span>
          <span style={{ fontWeight: 900 }}>NOTE</span>
        </div>
        {project && (
          <>
            <div style={s.sep}>›</div>
            <div style={s.projectName}>{project.name}</div>
            {project.client && <div style={s.clientName}>— {project.client}</div>}
          </>
        )}
      </div>

      <div style={s.right}>
        {showPush && (
          <button style={s.pushBtn} onClick={onPush}>
            ↑ Push to RedTrack
          </button>
        )}
        {showBack && (
          <button style={s.iconBtn} onClick={onBack} title="All Projects">
            ⊟
          </button>
        )}
        <button style={s.iconBtn} onClick={onSettings} title="Settings">
          ◎
        </button>
        <div style={s.winControls}>
          <button style={s.winBtn} onClick={() => appWindow.minimize()}>─</button>
          <button style={s.winBtn} onClick={() => appWindow.toggleMaximize()}>□</button>
          <button style={{ ...s.winBtn, color: 'var(--red)' }} onClick={() => appWindow.close()}>✕</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  bar: { height: 38, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0, userSelect: 'none' },
  left: { display: 'flex', alignItems: 'center', gap: 8 },
  logo: { fontSize: 12, fontWeight: 700, letterSpacing: '.05em' },
  sep: { color: 'var(--muted2)', fontSize: 14 },
  projectName: { fontSize: 11, color: 'var(--text)', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  clientName: { fontSize: 11, color: 'var(--muted)' },
  right: { display: 'flex', alignItems: 'center', gap: 6 },
  pushBtn: { background: 'var(--red)', border: 'none', borderRadius: 4, color: '#fff', padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 700 },
  iconBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 4 },
  winControls: { display: 'flex', gap: 2, marginLeft: 8 },
  winBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 3 },
}
