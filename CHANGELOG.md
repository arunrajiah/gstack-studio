# Changelog

All notable changes to gstack Studio are documented here.

Format: [Semantic Versioning](https://semver.org) — `Added`, `Changed`, `Fixed`, `Removed`.

---

## [0.8.0] — 2026-04-21

### gstack auto-install + "gS" app icon

**Added**
- **gstack auto-install during onboarding** — the Configure step now checks whether gstack is present at the typed path (debounced 400 ms). If it isn't found, an inline panel appears offering a one-click **"Install gstack automatically"** button. Clicking it runs `git clone --depth 1 https://github.com/garrytan/gstack <path>` in the background via `spawn`. A spinner shows during cloning; on success the path field is auto-populated; on failure the full error message and a Retry button are shown. The Continue button stays disabled while installation is in progress.
- **`gstack:check` IPC handler** — returns `true` if a directory exists and contains at least one `SKILL.md`, confirming it is a valid gstack install.
- **`gstack:install` IPC handler** — accepts a `targetPath`, creates parent directories, and spawns `git clone --depth 1`. Returns `{ success, path, error? }`.
- `client.checkGstack()` and `client.installGstack()` renderer client wrappers.
- **Letter-based "gS" app icon** — replaced the three-bar design with a pixel-art **gS monogram**: lowercase _g_ in indigo-400 and uppercase _S_ in white, on the same zinc-950 rounded-rect background. Each letter is a 5×7 bitmap rendered as rounded-corner blocks (72 px cells, 10 px radius). Icon regenerated at 1 024×1 024 px with no external dependencies.

**Changed**
- Onboarding welcome step no longer lists gstack as a hard prerequisite — the wizard offers to install it automatically.
- README prerequisites updated: gstack is now optional at first launch; git is listed as a requirement for auto-install.
- `scripts/generate-icon.mjs` fully rewritten to use the new "gS" pixel-font approach.

---

## [0.7.0] — 2026-04-21

### Direct agent execution

**Added**
- **▶ Run button on every skill** — Sprint Board cards and Agents page rows now show a play button on hover. Clicking it opens a real interactive terminal window with `<host> /<skill>` ready to run — no copy-paste needed.
- **Agent Host settings section** — new section in Settings auto-detects installed AI coding hosts (Claude Code, Codex, OpenClaw, Factory, Kiro) by scanning common install paths and `$PATH`. Shows each host with a found / not found badge. Click to select; hosts that aren't installed are greyed out. Includes a custom binary path override field for edge cases.
- **Cross-platform terminal launcher** — macOS uses iTerm2 if running, otherwise Terminal.app (via AppleScript); Windows opens `cmd.exe /K`; Linux tries gnome-terminal → xterm → konsole → xfce4-terminal in order.
- **`host:detect` IPC handler** — scans filesystem + `which` to resolve the actual binary path for each supported host. Returns `DetectedHost[]` with `id`, `label`, `bin`, `available` fields.
- **`skill:execute` IPC handler** — accepts skill ID + host binary, opens terminal, and also copies the command to clipboard as a fallback.
- `DetectedHost` type and `client.host.detect()` / `client.executeSkill()` methods added to the renderer client layer.

**Changed**
- If no host is configured and Run is clicked, a toast error appears and Settings opens automatically so the user can pick one.
- `AppConfig` gains a `hostBin` field (persisted in `~/.gstack/studio-config.json`) — migrates transparently from older configs.

---

## [0.6.0] — 2026-04-21

### Dark/light theme + dynamic skill loading

**Added**
- **Dark / Light / System theme toggle** — Appearance section in Settings with a three-way segmented control (Dark · Light · System). System mode follows `prefers-color-scheme` and updates live when the OS switches. Preference stored in `~/.gstack/studio-config.json`. Theme class applied synchronously before first render to eliminate flash.
- **Dynamic skill loading** — Sprint Board and Agents page now scan `~/.claude/skills/gstack/` at runtime and parse each `SKILL.md` frontmatter for live name and description. New skills from `/gstack-upgrade` appear automatically with no app update required. Unknown skills default to the Utils phase with a wrench icon.

**Changed**
- All zinc background, text, and border classes now carry light-mode defaults alongside `dark:` variants — every page and component is fully themed
- Sprint Board subtitle shows the real installed skill count instead of the hardcoded "23"
- Command Palette description updated to remove hardcoded count

---

## [0.5.0] — 2026-04-19

### Command palette, Sprint search, History export, Script runner

**Added**
- **Command palette (⌘K / Ctrl+K)** — instant overlay that searches all 23 skills and all 6 navigation pages. ↑/↓ to navigate, Enter to select (copy skill command or navigate), Escape to dismiss. Also reachable via the search button in the title bar. Skills show phase badge, copy icon, and `/id`; pages show their keyboard shortcut.
- **Sprint Board search** — filter text input in the page header searches skill name, ID, description, and phase across all cards in real time. Empty state shown when no match. Result count displayed in subtitle.
- **History export** — "JSON" and "MD" download buttons appear next to the search bar when learnings are loaded. JSON exports the raw array; Markdown formats each entry with timestamp, skill badge, message, and any extra fields in a fenced code block.
- **Browse Console script runner** — new "Script" mode tab (alongside "Terminal"). Multi-line textarea where each line is one command; `#` lines are comments. "Run Script" executes them sequentially, shows progress counter (`N / total`), stops and toasts on error.

**Changed**
- Browse Console header reorganised: mode tabs (Terminal | Script) added left of the reference toggle
- Title bar now shows a clickable `Search ⌘K` button that opens the command palette
- Sprint Board phase pipeline row is hidden when search is active and results span multiple phases (still grouped when shown)

---

## [0.4.0] — 2026-04-19

### UX polish & power-user features

**Added**
- **Toast notification system** — non-blocking bottom-right toasts for all key actions: daemon start/stop/restart, settings saved, commands copied, log copy, errors. Built on a zero-dependency event bus (`lib/toast.ts`) so any page can fire a toast with `toast.success/error/info(msg)`.
- **Browse Console command reference** — collapsible panel listing 30+ browser automation commands organised by category (Navigation, Content, Interaction, Tabs, Storage & Network). Click any row to pre-fill the input and jump straight to typing.
- **Browse Console command history** — ↑/↓ arrow keys cycle through the last 100 commands, exactly like a real terminal. History is deduplicated.
- **Copy logs** — Copy button in Browse Console and Agents page live log stream. Copies the full formatted log to clipboard and fires a toast confirmation.
- **Auto-start daemon setting** — toggle switch in Settings → Daemon section. When enabled, Studio automatically starts the browse server on app launch (if gstack path and workspace are configured).
- **App version display** — Settings page footer shows current Studio version (`gstack Studio vX.Y.Z`).
- **Global keyboard shortcuts** — `⌘/Ctrl+1`–`6` navigate directly to Dashboard / Sprint Board / Agents / Browse Console / History / Settings. Shortcuts shown in sidebar icon tooltips.

**Changed**
- Daemon start/stop/restart now fire toast notifications on success and failure (previously silent in the UI)
- Browse Console quick-action bar extended from 5 to 6 examples (`url` added)
- Browse Console header reorganised to show the reference toggle button top-right
- Sprint Board `SkillCard` copy fires a toast (`/id copied to clipboard`)
- Agents page `SkillRow` copy fires a toast
- Sidebar icon tooltips include keyboard shortcut (`Dashboard  ⌘1`, etc.)

---

## [0.3.0] — 2026-04-18

### Quality & Polish

**Added**
- **First-launch onboarding wizard** — 3-step flow (Welcome → Configure → Done) shown automatically when gstack path or workspace is not configured. Guides new users through setup without needing to find Settings.
- **Skill documentation viewer** — click the book icon on any skill card (Sprint Board) or skill row (Agents page) to open a modal that reads and renders the skill's `SKILL.md`. Includes a "Copy command" button and supports headings, bold, inline-code, and fenced code blocks.
- **Open in Finder / Explorer** — `ExternalLink` button next to the workspace path on the Dashboard daemon card and in Settings for both the workspace and gstack paths. Calls the OS file manager directly.
- **Custom title bar (Windows / Linux)** — native Min / Max / Close buttons rendered in the app chrome when running on non-macOS platforms. Matching red hover on Close.
- **React error boundary** — each page is wrapped in `<ErrorBoundary>` with a graceful fallback UI (icon + error message + "Try again" button).
- **Auto-updater** — `electron-updater` wired to GitHub Releases. An update banner appears in the title bar when a new version is available; one click downloads, a second click installs and restarts.
- **App icon** — distinctive gstack Studio icon (zinc-950 background + three indigo stack bars) generated by a pure Node.js script (`scripts/generate-icon.mjs`). No external dependencies.
- `shell:open-path` and `shell:open-url` IPC handlers in main process + preload + client
- `skill:read-doc` IPC handler — reads `SKILL.md` from the gstack install path for any skill ID
- `app:version` IPC handler — returns the app version to the renderer

**Changed**
- Text selection is now enabled by default throughout the app (was globally blocked by `user-select: none`). Code areas, log lines, and paths are all selectable.
- Layout component now checks config on load and shows the onboarding overlay if setup is incomplete.
- Agents page skill rows restructured into a `<div>` with separate copy and doc-viewer action buttons.
- Sprint Board skill cards gain a `BookOpen` icon button (shows on hover) to open the doc viewer.
- `electron-builder.yml`: `icon: build/icon.png` added; `publish.provider: github` configured for auto-update metadata.

**Fixed**
- Removed unused `@anthropic-ai/sdk` dependency (was installed but never imported, bloating the install).

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
