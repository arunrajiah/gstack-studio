# Changelog

All notable changes to gstack Studio are documented here.

Format: [Semantic Versioning](https://semver.org) — `Added`, `Changed`, `Fixed`, `Removed`.

---

## [0.2.0] — 2026-04-19

### Layer 2 — Daemon & Workspace Management

**Added**
- **Stop daemon** button on Dashboard (red, appears when daemon is running)
- **Restart daemon** button on Dashboard (restarts daemon in current workspace)
- **Workspace quick-switcher** dropdown on Dashboard — one click to switch between recent workspaces; daemon auto-restarts in the new workspace
- **Native folder picker** — Browse buttons in Settings and the workspace switcher open the OS file-selection dialog instead of requiring a manual path
- **Recent workspaces** list in Settings — click any path to set it as active; stored in `~/.gstack/studio-config.json` (max 5 entries)
- `recentWorkspaces` field added to `AppConfig`; migrates transparently from v0.1 configs

**Changed**
- `useDaemon()` hook now exposes `stop()` and `restart()` in addition to `start()`
- Daemon status dot shows yellow pulse while an action is in progress

### Layer 3 — Live Agent Output

**Added**
- **Agents page** (new sidebar icon `Bot`) — full command centre with:
  - Left panel: searchable skill browser with phase filter (All / Think / Plan / … / Utils)
  - Right panel: live daemon log stream (stdout + stderr) — polls every 2 s, colour-coded by source
  - Auto-scroll toggle; pauses when you scroll up to inspect a line
- **Daemon log ring buffer** in main process — captures the last 500 lines of daemon stdout/stderr, accessible via `daemon:logs` IPC
- `useDaemonLogs(enabled)` hook in `store.ts` — polls daemon logs and drives the Agents page feed

### History page

**Added**
- **Full-text search** input filters learnings in real time by any JSON field
- Match count indicator (`N / total`)
- Matching preview text highlighted in amber
- Project sidebar now shows `has learnings` subtitle

---

## [0.1.0] — 2026-04-18

### Initial release — Layer 1

**Added**
- Electron desktop app (`gstack Studio`) for macOS, Windows, and Linux
- **Dashboard** — daemon health indicator, Start Daemon button, quick-action shortcuts
- **Sprint Board** — all 23 gstack agents organised by phase (Think → Reflect + Utils); click any card to copy its slash command
- **Browse Console** — interactive HTTP terminal for the gstack browse daemon (56 commands)
- **History** — per-project learnings viewer reading `~/.gstack/projects/*/learnings.jsonl`
- **Settings** — workspace directory, gstack install path, Anthropic/OpenAI API keys
- Daemon auto-restarts on health-check failure every 15 s
- Config stored at `~/.gstack/studio-config.json` (mode 0600)
- GitHub Actions CI: type-check on every PR; cross-platform release (`.dmg`, `.exe`, `.AppImage`, `.deb`) on version tags
