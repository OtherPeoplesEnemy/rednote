# RedNote

Offline-first pentest note taking app that syncs to RedTrack.

Works like CherryTree but purpose-built for pentesting. Tree-structured notes, structured finding forms, push to RedTrack when ready.

## Features

- **Tree navigation** — organize notes by recon, findings, exploitation, screenshots
- **Markdown editor** — split pane edit/preview, syntax highlighting
- **Structured findings** — severity, CVSS, CWE, steps to reproduce, remediation
- **Push to RedTrack** — sync findings to RedTrack with duplicate detection
- **Fully offline** — SQLite database, works on air-gapped networks
- **Cross-platform** — Windows, Linux, macOS, Kali

## Install

### Prerequisites

**All platforms:**
- Node.js 18+
- Rust (https://rustup.rs)

**Linux/Kali:**
```bash
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows:**
- Microsoft C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

### Build

```bash
git clone https://github.com/YOURUSERNAME/redtrack.git
cd redtrack/rednote
npm install
npm run tauri build
```

The installer will be in `src-tauri/target/release/bundle/`

### Dev mode

```bash
npm run tauri dev
```

## Usage

1. Launch RedNote
2. Go to Settings → enter your RedTrack URL and API key
3. Create a new pentest project
4. Add nodes to the tree (right-click or press +)
5. Write notes in markdown, create structured findings
6. When ready, click **↑ Push to RedTrack** in the title bar
7. Select your engagement and push

## Duplicate Prevention

Each finding gets a local UUID. When pushed to RedTrack, the UUID is stored. On subsequent pushes, existing findings are updated rather than duplicated.

## Keyboard Shortcuts

- `Ctrl+S` — Save current note
- `Ctrl+B` — Bold
- `Ctrl+I` — Italic
- `F2` — Rename selected node
- `Delete` — Delete selected node (with confirmation)
