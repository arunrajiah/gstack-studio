# Changelog

All notable changes to gstack Studio are documented here.

Format: [Semantic Versioning](https://semver.org) — `Added`, `Changed`, `Fixed`, `Removed`.

---

## [0.12.0] — 2026-04-26

### Visual polish — Linear/Vercel-quality UI throughout

**Changed — Titlebar**
- Background: `bg-white/80 dark:bg-zinc-950/80` frosted glass with `backdrop-blur-md`
- Brand: Zap icon in indigo-600 square + `gradient-text` "gstack" logotype (indigo → violet gradient via background-clip)
- Status chip: `border border-emerald-500/20` with inner glow dot (`shadow-[0_0_6px_#34d399]`) when AI Browser is running
- All interactive elements gain `btn-press` scale(0.97) micro-animation on active

**Changed — Sidebar**
- Active state: left indicator bar (`w-0.5 h-6 rounded-r-full bg-indigo-500`) replaces full-width fill — Linear-style
- Icon `strokeWidth` transitions between 1.8 (resting) and 2.2 (active) for crisp visual feedback
- Active background: `bg-indigo-50 dark:bg-indigo-950/40` (subtle, not heavy)

**Changed — Agent Board (Sprint)**
- Agent cards: `card-lift` hover lift (translateY −1px + layered box-shadow), `border-l-[3px]` phase-accent left border per phase colour
- Phase section headers show inline descriptions, always visible (not collapsed)
- Skeleton loading: 3 × 4 shimmer cards with animated gradient sweep while skills load
- Empty search state: Search icon + "No agents match" message + "Clear search" button
- `page-enter` fade-in + translateY(6px) animation on page load

**Changed — Dashboard**
- AI Browser hero card: conditional gradient background — emerald glow (`from-emerald-950/30`) when running, zinc gradient when stopped
- Running state outer glow: `shadow-[0_0_32px_rgba(52,211,153,0.08)]` on card border
- Status icon: `glow-green` box-shadow on the icon container when running; green dot with `shadow-[0_0_6px_#34d399]` + border-2 badge overlay
- Quick Action cards: `card-lift` + `bg-white dark:bg-zinc-900`; icon in rounded-lg coloured background
- Project cards: `card-lift` + folder icon in tinted rounded-lg
- All buttons gain `btn-press` + shadow accents

**Changed — History**
- Timeline design: vertical line connecting entries (`absolute left-[7px] w-px bg-zinc-200 dark:bg-zinc-800/80`)
- Per-entry: 14px dot marker that glows indigo (`shadow-[0_0_6px_rgba(99,102,241,0.4)]`) when the card is expanded; card border shifts to `border-indigo-200/60 dark:border-indigo-800/40`
- Timestamp: 10px monospace with clock icon above the preview line
- Skill badge: `/{skill}` monospace in indigo pill
- Preview text: 2-line `line-clamp-2`; highlighted amber when matching search query
- Project sidebar: Linear-style left indicator (matches Sidebar.tsx pattern); Sparkles badge for learning-enabled projects
- Skeleton loading: 4-row shimmer (dot + bar) while fetching entries
- Empty states: icon-in-box design with helpful copy for both no-project and no-results cases

**Changed — SkillDocModal**
- Backdrop: `bg-black/40 dark:bg-black/60 backdrop-blur-md` (stronger depth than before)
- Card shadow: `shadow-[0_32px_64px_rgba(0,0,0,0.20),0_8px_24px_rgba(0,0,0,0.12)]` layered; darker in dark mode
- Entrance animation: `modal-enter` keyframe — scale(0.96) → scale(1) + translateY(8px) → 0 over 160ms cubic-bezier(0.16,1,0.3,1) spring easing
- Backdrop fades in via `page-fade-in` at 120ms

**Added — CSS utility system (`globals.css`)**
- `page-enter` — 180ms fade + translateY(6px) page entrance
- `modal-enter` — 160ms spring scale + slide entrance for modals
- `card-lift` — 150ms hover lift with layered box-shadow (dark-mode variant)
- `gradient-text` — indigo-818cf8 → indigo-6366f1 → violet-a78bfa background-clip gradient
- `glow-green` / `glow-indigo` — ambient glow box-shadows
- `skeleton` — 200% background-size sweep shimmer animation (1.4s)
- `phase-think/plan/build/review/test/ship/reflect/utils` — left border colour classes per phase
- `btn-press` — scale(0.97) + opacity(0.9) on `:active`
- Custom scrollbar: 5px, `border-radius: 99px`, themed per dark/light mode
- `focus-visible` indigo ring (2px, offset 2px) across all interactive elements

---

## [0.11.0] — 2026-04-26

### UX overhaul — accessible to everyone, not just coders

**Changed — Plain-English UI throughout**
- Replaced "daemon" with "AI Browser" in all user-facing labels across Dashboard, Settings, and Agents page — technical internal identifiers unchanged
- "Start Daemon" button → **"Start AI Browser"** with a plain-English subtitle: _"Start the AI Browser so agents can navigate and read websites"_
- "Live Daemon Output" panel → **"Live Activity"** with subtitle: _"Real-time output from the AI browser service"_
- "Browse Console" renamed to **"Browser Automation"** throughout Sidebar, page heading, and documentation
- "Daemon" Settings section → **"AI Browser service"**
- "Agent Host" Settings section → **"AI coding tool"** with improved description
- "Workspace Directory" Settings field → **"Project folder"**
- "gstack Install Path" Settings field → **"gstack location"**
- "Sprint Board" → **"Agent Board"** in page heading; sidebar label shortened to "Agents"
- Sidebar icons now show **text labels** beneath each icon (was icon-only) so every nav item is identifiable without hover
- Sprint Board phase badges now always show a plain-English **phase description** ("Check the work — code review, security scan, quality check") next to the phase label — no longer hidden
- "good for everyone" badge added to agent phases accessible to non-coders (Think, Plan, Review, Reflect)
- Settings page subtitle changed from a raw file path to "Configure how gstack Studio works on your machine"
- Projects section on Dashboard: "no data yet" → "no history yet", "learnings" → "AI learnings saved"

**Added — Onboarding improvements**
- Onboarding feature cards redesigned with outcome-first language and icon-backed descriptions (was plain text with emoji)
- "Prerequisites" box renamed to **"Quick system check"** with clearer Bun install instructions:
  - Shows the install command in a styled code block
  - Adds "Open bun.sh for instructions" external link
  - Explains that restarting the app will re-run the check
- Configure step field labels rewritten: "gstack Install Path" → "Where is gstack installed?", "Workspace Directory" → "Which project folder are you working on?"
- Error messages use natural language ("gstack wasn't found at that path") instead of terse codes
- Done step adds a **"What happens next"** info card explaining the first actions after setup

**Added — Dashboard "What would you like to do today?"**
- When the AI Browser is stopped, a new **guided task panel** replaces the empty state — 5 starter tasks (Review my code, Check project health, Plan a new feature, Run quality checks, Ship my changes) with descriptions and icons. Clicking any task navigates to the Agent Board.
- Quick Action cards now show an **outcome description** ("AI reviews your code for bugs and improvements") below the skill name — always visible, not just on hover
- Quick Action cards show a **"everyone" badge** on skills accessible to non-developers
- Dashboard subtitle updated: "Your AI engineering team, ready to sprint" → "Your AI engineering team, ready to work"
- Workspace menu "Recent workspaces" → "Recent projects"

**Added — Agent Board phase explainer**
- New **"What are phases?" toggle** in the Agent Board header expands a grid explaining all 8 phases in plain English — helps new users understand the workflow without CLI experience
- Phase descriptions appear inline next to phase badges in the skill grid, always visible
- "Filter skills…" placeholder → "Search agents…"

**Added — Browser Automation Task mode**
- New **"Tasks" mode** tab (shown by default) presents common browser operations as form inputs — no command syntax required:
  - Go to a website (URL field)
  - Take a screenshot (one click)
  - Read page text
  - List all links
  - Click an element (selector field)
  - Fill in a form field (selector + text fields)
  - Get page HTML
  - Show open tabs
  - Go back / Go forward / Reload
- Each task shows a plain-English description
- Terminal and Script modes remain unchanged for advanced users

---

## [0.10.1] — 2026-04-25

### gstack v1.12.x sync — 2 new skills

**Added**
- **`landing-report`** (Ship phase 📋) — new read-only dashboard skill showing the open PR version queue for workspace-aware shipping (added in gstack v1.11.0.0)
- **`setup-gbrain`** (Utils phase 🧠) — full onboarding flow for the gbrain cross-machine memory CLI: installs the binary, registers `mcp__gbrain__*` tools in Claude Code, configures per-remote trust tiers (read-write / read-only / deny). Added in gstack v1.12.0.0.

No new browse daemon commands in this window (gstack v1.6.4.0–v1.12.2.0 browse changes were internal security tuning only).

---

## [0.10.0] — 2026-04-22

### gstack v1.x sync — new skills, expanded Browse Console

**Added**
- **3 new skills** synced from gstack v1.x upstream:
  - `benchmark-models` (Test phase 🤖) — cross-model benchmark (Claude vs GPT vs Gemini)
  - `make-pdf` (Utils phase 📄) — markdown → publication-quality PDF via Chromium
  - `plan-tune` (Plan phase 🎛️) — self-tuning question sensitivity and psychographic profile
- **15 new Browse Console commands** synced from gstack v1.x browse daemon, across 2 new categories and expansions to existing ones:
  - Navigation: `load-html` (raw HTML via setContent), `frame` (switch iframe context)
  - Content: `media`, `data`, `prettyscreenshot`, `scrape`, `archive`
  - Interaction: `style` (CSS property override, undoable), `cleanup` (remove ads/banners)
  - Storage & Network: `state` (save/restore browser state)
  - **Inspection** *(new category)*: `inspect` (CDP full rule cascade), `ux-audit` (UX behavioural JSON)
  - **Session** *(new category)*: `handoff` (open Chrome for user takeover), `resume` (re-snapshot after handoff), `watch` (passive periodic snapshots)
- Browse Console command reference now covers **44 commands across 7 categories** (was 29 across 5).

**Removed**
- `debug` skill entry removed from `SKILL_DECORATION` — this skill does not exist in the gstack upstream repo and was an orphaned stub causing a ghost card when `gstackPath` is unconfigured.

**Changed**
- `screenshot` command description updated to reflect new `--selector <css>` flag support (gstack v1.1+).

---

## [0.9.0] — 2026-04-22

### UX polish — Bun check, daemon crash notification, CHANGELOG fix

**Added**
- **Bun presence check in onboarding** — on mount the wizard calls a new `bun:check` IPC handler that scans common install paths and `$PATH` for the Bun binary. The Welcome step shows a live ✓ found / ✗ not found badge next to the Bun prerequisite. If Bun is missing, an install command (`curl -fsSL https://bun.sh/install | bash`) and a link to bun.sh appear on both the Welcome and Configure steps.
- **`bun:check` IPC handler** — resolves `~/.bun/bin/bun`, common system paths, and `which bun`. Returns `{ found, path }`.
- **Daemon crash notification** — `useDaemon` in `store.ts` now tracks whether the daemon was running on the previous poll. If it disappears between polls without the user having clicked Stop or Restart, a `toast.error` fires: _"Daemon stopped unexpectedly — restart from Dashboard or check logs"_. Explicit user-initiated stops and restarts are excluded via an `intentionalStop` ref.

**Fixed**
- CHANGELOG v0.4.0 incorrectly stated "30+ browser automation commands" — corrected to 29 at the time (Navigation: 6, Content: 7, Interaction: 7, Tabs: 4, Storage & Network: 5). v0.10.0 expands this to 44 across 7 categories.

**Changed**
- `store.ts` imports `useRef` and `useDaemon` now syncs `wasRunning` and `wasIntentionalStop` refs on every start/stop/restart IPC call in addition to the poll cycle, preventing false-positive crash toasts.

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
- **Browse Console command reference** — collapsible panel listing 29 browser automation commands organised by category (Navigation: 6, Content: 7, Interaction: 7, Tabs: 4, Storage & Network: 5). Click any row to pre-fill the input and jump straight to typing.
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
