<div align="center">
  <h1>gstack Studio</h1>
  <p><strong>A visual desktop app for <a href="https://github.com/garrytan/gstack">gstack</a> — discover, run, and monitor AI agents without touching the CLI.</strong></p>
  <p><em>Built for everyone: developers, PMs, designers, and anyone working alongside AI-powered engineering teams.</em></p>

  <p>
    <a href="https://github.com/arunrajiah/gstack-studio/releases/latest"><img src="https://img.shields.io/github/v/release/arunrajiah/gstack-studio?style=flat-square&label=latest&color=6366f1" alt="Latest Release" /></a>
    <a href="https://github.com/arunrajiah/gstack-studio/releases"><img src="https://img.shields.io/github/downloads/arunrajiah/gstack-studio/total?style=flat-square&color=6366f1&label=downloads" alt="Downloads" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
    <a href="https://github.com/arunrajiah/gstack-studio/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/arunrajiah/gstack-studio/build.yml?branch=main&style=flat-square&label=build" alt="Build" /></a>
    <a href="https://github.com/garrytan/gstack"><img src="https://img.shields.io/badge/requires-gstack-8b5cf6?style=flat-square" alt="Requires gstack" /></a>
  </p>

  <p>
    <a href="https://github.com/sponsors/arunrajiah"><img src="https://img.shields.io/badge/sponsor-%E2%9D%A4-ea4aaa?style=flat-square&logo=github-sponsors" alt="Sponsor" /></a>
  </p>

  <p>
    <a href="#-download">Download</a> ·
    <a href="#-features">Features</a> ·
    <a href="#-prerequisites">Prerequisites</a> ·
    <a href="#-getting-started">Getting Started</a> ·
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/dashboard.png" alt="Dashboard — gradient AI Browser hero card, Start/Stop/Restart, guided task panel, workspace switcher" />
      <br /><sub><b>Dashboard</b> — AI Browser status, Start/Stop/Restart, "What would you like to do?" guided tasks</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/sprint.png" alt="Agent Board — phase-coloured cards with left accent border, phase pipeline strip, search, phase explainer" />
      <br /><sub><b>Agent Board</b> — 40+ agents by phase, phase-coloured cards, click to copy or ▶ run in terminal</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/agents.png" alt="Activity — searchable skill browser with phase filter and live AI browser log stream" />
      <br /><sub><b>Activity</b> — searchable skill browser with live AI browser log stream, ▶ run any agent</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/browse.png" alt="Browser Automation — Tasks, Terminal, and Script modes for headless browser control" />
      <br /><sub><b>Browser Automation</b> — Tasks (form-based), Terminal, and Script modes; 44 commands</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/settings.png" alt="Settings — project folder, gstack location, AI Browser service, AI coding tool picker, theme toggle" />
      <br /><sub><b>Settings</b> — project folder, gstack location, AI coding tool picker, dark/light/system theme</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/command-palette.png" alt="Command Palette — ⌘K to instantly search all pages and agents" />
      <br /><sub><b>Command Palette (⌘K)</b> — instant search across all pages and agents</sub>
    </td>
  </tr>
</table>

---

> **gstack Studio is a companion app for [gstack](https://github.com/garrytan/gstack).**
> It does not replace gstack — it wraps it in a polished GUI so you can discover agents, copy slash commands, monitor the AI browser service, and review project history, all without memorising CLI commands.
>
> **You don't need to be a developer to use it.** Product managers, designers, and founders can browse agents, understand what each one does, and trigger AI-powered workflows from a clean visual interface.

---


## ✨ Features

| Page | What it does |
|------|-------------|
| **Dashboard** | AI Browser health with gradient status card, Start / Stop / Restart, "What would you like to do today?" guided task panel, quick action cards with outcome descriptions, workspace switcher |
| **Agent Board** | 40+ AI agents organised by phase (Think → Plan → Build → Review → Test → Ship → Reflect) — phase-coloured left-accent cards, plain-English phase descriptions, audience badges, "What are phases?" explainer. Click any card to copy its `/command`; ▶ run directly in terminal |
| **Activity** | Searchable agent browser with phase filter + live AI browser log stream; per-agent doc viewer (renders SKILL.md) and ▶ run in terminal |
| **Browser Automation** | Three modes: **Tasks** (form-based, no syntax needed), **Terminal** (raw command input), **Script** (multi-line batch). Covers 44 browser commands across 7 categories |
| **History** | Per-project AI learnings with timeline design, full-text search, and export (JSON / Markdown), stored in `~/.gstack/projects/*/learnings.jsonl` |
| **Settings** | Project folder, gstack location, AI coding tool auto-detection (Claude Code / Codex / OpenClaw / Factory / Kiro), colour theme (dark / light / system), auto-start toggle, API keys |

### Designed for everyone

- **Non-coders**: plain-English labels throughout, outcome-focused descriptions, guided task panel, form-based browser automation, labelled sidebar navigation
- **Developers**: full terminal mode, script runner, command history, phase-organised agent grid, live log streaming, SKILL.md doc viewer
- **New users**: onboarding wizard auto-installs gstack with one click, Bun check with clear install instructions, "What happens next" guidance after setup

### Additional capabilities

- **Direct agent execution** — ▶ Run button on every skill opens a real interactive terminal with `claude /skill` (or codex / OpenClaw / Factory / Kiro) — no copy-paste required
- **AI coding tool auto-detection** — Settings scans common install paths and `$PATH` for all 10 supported tools (Claude Code, Codex, OpenClaw, Factory, Kiro, OpenCode, Cursor, Slate, Hermes, GBrain); click to select, custom path override available
- **First-launch onboarding wizard** — guided 3-step setup with **one-click gstack auto-install**: if gstack isn't found, the Configure step clones it from GitHub automatically
- **Skill documentation viewer** — reads each skill's `SKILL.md` and renders it inline (headings, bold, code blocks) with a Copy Command button
- **Auto-update** — checks GitHub Releases on startup; shows a download banner in the title bar when a new version is available
- **Labelled navigation sidebar** — every nav item shows its icon + text label (not icon-only), so the app is navigable without hover or prior knowledge
- **Custom window chrome** (Windows / Linux) — native Min / Max / Close buttons integrated in the app title bar
- **Error boundary** — each page catches React errors and shows a graceful fallback UI

### What gstack Studio is NOT
- It does not replace the Claude Code CLI — agents still run inside your chosen AI coding tool (Claude Code, Codex, etc.). The ▶ Run button simply opens a pre-filled terminal for you
- It does not modify gstack in any way — zero changes to the gstack codebase (Layer 1 integration only)
- It is not a standalone AI coding assistant

---

## ⬇️ Download

> Pre-built binaries are attached to every [GitHub Release](https://github.com/arunrajiah/gstack-studio/releases).

| Platform | Format | Download |
|----------|--------|----------|
| macOS (Apple Silicon) | `.dmg` | [Latest release →](https://github.com/arunrajiah/gstack-studio/releases/latest) |
| macOS (Intel) | `.dmg` | [Latest release →](https://github.com/arunrajiah/gstack-studio/releases/latest) |
| Windows (x64) | `.exe` installer | [Latest release →](https://github.com/arunrajiah/gstack-studio/releases/latest) |
| Linux (x64) | `.AppImage` / `.deb` | [Latest release →](https://github.com/arunrajiah/gstack-studio/releases/latest) |

Or build from source — see [Development](#-development).

---

## 🔑 Prerequisites

1. **[Bun](https://bun.sh)** — required to run the AI browser service (`curl -fsSL https://bun.sh/install | bash` or `brew install bun`)
2. **[git](https://git-scm.com)** — required if you want the onboarding wizard to auto-install gstack
3. An **AI coding tool** — Claude Code, Codex, OpenClaw, Factory, or Kiro (for running agents)
4. An **Anthropic API key** — optional, only needed if running agents programmatically via the API

> **gstack** is required — without it there are no agents, no AI browser service, and no Browser Automation page. However, you don't need to install it before launching the app. If gstack isn't present, the onboarding wizard installs it for you with one click.
>
> gstack Studio works on macOS, Windows, and Linux. The AI browser service requires Bun; the onboarding wizard checks for Bun and shows clear install instructions if it's missing.

---

## 🚀 Getting Started

### 1. Install gstack Studio

Download the installer for your platform from [Releases](https://github.com/arunrajiah/gstack-studio/releases) and run it.

### 2. Configure your workspace

On first launch an **onboarding wizard** guides you through setup automatically.

- If gstack is **already installed**, point the wizard to it.
- If gstack is **not installed yet**, click **"Install gstack automatically"** — Studio will clone it from GitHub in the background and fill in the path for you.

You can also configure paths at any time in **Settings**:

- **Workspace Directory** — the project folder where you run gstack (e.g. `~/my-project`). The daemon will start from this directory.
- **gstack Install Path** — where gstack is installed (default: `~/.claude/skills/gstack`).
- **Anthropic API Key** — optional, stored locally in `~/.gstack/studio-config.json`.

### 3. Start the AI Browser

Go to **Dashboard** and click **Start AI Browser**. The status dot turns green when the service is live and agents can use the web.

### 4. Pick an agent and run it

Open the **Agent Board**, find any agent, and click its card to copy the command (e.g. `/review`). Paste it into Claude Code, or click ▶ to open a pre-filled terminal automatically.

Not sure where to start? The Dashboard shows a **"What would you like to do today?"** panel with 5 common starting tasks and plain-English descriptions.

---

## 🗺️ Roadmap

- [x] **Layer 1** — Read-only GUI: Sprint Board, Browse Console, History, Settings
- [x] **Layer 2** — Daemon controls (Stop/Restart), workspace switcher, native folder picker, recent workspaces
- [x] **Layer 3** — Live daemon log streaming, Agents command centre with searchable skill browser
- [x] **v0.3.0** — Onboarding wizard, skill doc viewer, Open in Finder, auto-update, custom title bar, error boundary, app icon
- [x] **v0.4.0** — Toast notifications, Browse Console history + command reference, auto-start daemon, copy logs, keyboard shortcuts (⌘1–6), app version display
- [x] **v0.5.0** — Command palette (⌘K), Sprint Board search, History export (JSON/MD), Browse Console script runner
- [x] **v0.6.0** — Dark/light/system theme toggle, dynamic skill loading (auto-syncs with `/gstack-upgrade`)
- [x] **v0.7.0** — Direct agent execution — ▶ Run any skill in a real terminal; agent host auto-detection (Claude Code, Codex, OpenClaw, Factory, Kiro)
- [x] **v0.8.0** — gstack auto-install during onboarding (one-click git clone); letter-based "gS" app icon
- [x] **v0.9.0** — UX polish: Bun presence check in onboarding wizard; AI browser crash notification toast
- [x] **v0.10.0** — gstack v1.x sync: 3 new skills (benchmark-models, make-pdf, plan-tune); 15 new Browser Automation commands; 2 new categories (Inspection, Session); removed orphaned `debug` stub
- [x] **v0.10.1** — gstack v1.12.x sync: 2 new skills (landing-report, setup-gbrain)
- [x] **v0.11.0** — UX overhaul for everyone: plain-English labels throughout, "What would you like to do today?" Dashboard panel, phase descriptions + audience badges, Browser Automation Task mode (form-based, no command syntax), labelled sidebar, outcome-first agent cards, improved onboarding copy
- [x] **v0.12.0** — Visual polish: frosted-glass titlebar, gradient-text brand, Linear-style sidebar with active indicator, phase-coloured left-accent agent cards with skeleton loading, gradient AI Browser hero card with glow status dot, History timeline design with animated dot markers, SkillDocModal spring-entrance animation with deep backdrop blur
- [x] **v0.13.0** — gstack v1.13–v1.21 sync: 2 new skills (scrape, skillify); 5 new agent hosts (OpenCode, Cursor, Slate, Hermes, GBrain); NON_SKILL_DIRS updated for browser-skills runtime and claude helper dirs
- [ ] **v1.0.0** — Windows / macOS code signing for Gatekeeper / SmartScreen-free distribution
- [ ] **Future** — Embedded terminal panel (xterm.js); run history log per workspace; multi-workspace side-by-side; Bun auto-install in onboarding

---

## 🛠️ Development

### Stack

- **Electron 33** + **electron-vite** — app shell
- **React 18** + **React Router v6** — renderer UI
- **Tailwind CSS v3** — styling
- **TypeScript** throughout
- **electron-builder** — cross-platform packaging

### Setup

```bash
# Clone
git clone https://github.com/arunrajiah/gstack-studio.git
cd gstack-studio

# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
```

### Build

```bash
# Type-check only
npm run typecheck

# Build all platforms (requires code signing certs for distribution)
npm run package

# Build for a specific platform
npm run package:mac
npm run package:win
npm run package:linux
```

Artifacts go to `dist/`.

### Project layout

```
gstack-studio/
├── scripts/
│   └── generate-icon.mjs     # Pure Node.js app icon generator (no external deps)
├── build/
│   └── icon.png              # Generated 1024×1024 app icon
├── src/
│   ├── main/                 # Electron main process (Node.js)
│   │   ├── index.ts          # App bootstrap, BrowserWindow, auto-updater
│   │   ├── daemon.ts         # GStackDaemon — spawn/stop browse server
│   │   └── ipc.ts            # IPC handlers exposed to renderer
│   ├── preload/
│   │   └── index.ts          # contextBridge — exposes window.gstack API
│   └── renderer/
│       └── src/
│           ├── App.tsx       # Router + layout shell
│           ├── components/
│           │   ├── Layout.tsx        # App shell with onboarding gate
│           │   ├── Titlebar.tsx      # Drag bar + daemon pill + update banner
│           │   ├── WindowControls.tsx # Min/Max/Close (Windows/Linux only)
│           │   ├── Sidebar.tsx       # Navigation
│           │   ├── ErrorBoundary.tsx # Page-level error fallback
│           │   └── SkillDocModal.tsx # SKILL.md viewer modal
│           ├── lib/
│           │   ├── gstack-client.ts  # window.gstack typed wrapper
│           │   └── store.ts          # React hooks (useDaemon, useSkills, useConfig…)
│           └── pages/
│               ├── Onboarding.tsx    # First-launch 3-step setup wizard
│               ├── Dashboard.tsx
│               ├── Sprint.tsx
│               ├── Browse.tsx
│               ├── History.tsx
│               ├── Agents.tsx
│               └── Settings.tsx
├── .github/
│   ├── workflows/
│   │   └── build.yml   # CI: type-check on PR, release binaries on tag
│   └── ISSUE_TEMPLATE/
├── electron-builder.yml
├── electron.vite.config.ts
└── package.json
```

---

## 🤝 Contributing

We welcome contributions of all kinds — bug fixes, new features, docs improvements, and design feedback.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

**Quick start:**

```bash
# Fork → clone → branch
git checkout -b feat/your-feature

# Make changes, then
npm run typecheck   # must pass
npm run dev         # manual test

# Commit using Conventional Commits
git commit -m "feat: add agent filter by phase"

# Push and open a PR against main
```

---

## 🔗 Related

- [garrytan/gstack](https://github.com/garrytan/gstack) — the AI agent framework this app wraps *(required — auto-installable via the onboarding wizard)*
- [Anthropic Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the CLI where gstack agents actually run

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  <sub>Built with ♥ as an open-source companion to <a href="https://github.com/garrytan/gstack">gstack</a>.</sub>
</div>
