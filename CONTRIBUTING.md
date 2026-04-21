# Contributing to gstack Studio

Thank you for taking the time to contribute! This document covers everything you need to get set up, the PR workflow, and our expectations for code quality.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Architecture Notes](#architecture-notes)

---

## Code of Conduct

Be kind, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## How to Contribute

| Type | Where to start |
|------|---------------|
| Bug fix | Open an issue with the **bug** template first, then a PR |
| New feature | Open a **feature request** issue to discuss scope before building |
| Docs / typo | PR directly — no issue needed |
| Design feedback | Open a discussion or comment on an existing issue |

---

## Development Setup

### Prerequisites

- **Node.js 20+** and **npm**
- **[gstack](https://github.com/garrytan/gstack)** installed locally (needed to test daemon integration)
- **[Bun](https://bun.sh)** (needed to run the gstack browse daemon during testing)

### Clone and install

```bash
git clone https://github.com/arunrajiah/gstack-studio.git
cd gstack-studio
npm install
```

### Run in dev mode

```bash
npm run dev
```

This launches Electron with Vite hot-reload. Changes to renderer code reload instantly; changes to `src/main/` or `src/preload/` require restarting the dev process.

### Type-check

```bash
npm run typecheck
```

This must pass before opening a PR. There is no test suite yet — we rely on TypeScript for correctness and manual testing for UI behaviour.

### Build a distributable

```bash
npm run package:mac     # macOS .dmg
npm run package:win     # Windows .exe
npm run package:linux   # Linux .AppImage + .deb
```

> Note: Building for a platform other than your own may produce unsigned or non-runnable binaries. CI handles official cross-platform builds.

---

## Branch & Commit Conventions

### Branches

| Prefix | Purpose |
|--------|---------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `chore/` | Build, CI, dependency updates |
| `refactor/` | Code restructure without behaviour change |

Example: `feat/agent-filter-by-phase`, `fix/daemon-spawn-on-windows`

### Commits — Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

Examples:
```
feat(sprint): add phase filter to sprint board
fix(daemon): use correct bun path on Windows
docs: update prerequisites section in README
chore: bump electron to 34
```

---

## Pull Request Process

1. **Fork** the repo and create your branch from `main`.
2. **Make your changes** — keep them focused. One concern per PR.
3. **Run `npm run typecheck`** — PRs that fail type-checking will not be reviewed.
4. **Test manually** — open the app, exercise the changed flow, and note what you tested in the PR description.
5. **Open the PR** against `main` using the PR template.
6. **Address review feedback** — we aim to respond within 48 hours.
7. **Squash merge** — maintainers will squash your commits on merge to keep history clean.

### PR checklist (copy into your PR description)

```
- [ ] `npm run typecheck` passes
- [ ] Manually tested the changed flow
- [ ] No debug `console.log` left in
- [ ] README updated (if new feature changes UX or setup)
- [ ] No new dependencies added without discussion
```

---

## Issue Reporting

### Bugs

Use the **Bug Report** issue template. Include:
- gstack Studio version (shown at the bottom of the Settings page)
- OS and architecture (e.g. macOS 14 Apple Silicon)
- gstack version (`git -C ~/.claude/skills/gstack log --oneline -1`)
- Steps to reproduce
- What you expected vs. what happened
- Electron DevTools console output if relevant (`Cmd/Ctrl+Shift+I`)

### Feature Requests

Use the **Feature Request** template. Describe the problem you're solving, not just the solution. We'll discuss scope before any code is written.

---

## Architecture Notes

Keep these in mind when contributing:

### IPC boundary

The renderer (React) **cannot** call Node.js APIs directly. All file system access, daemon management, and clipboard writes go through:

```
renderer → contextBridge (preload/index.ts) → ipcRenderer.invoke → ipcMain handler (main/ipc.ts)
```

If you need a new capability in the renderer, add an IPC handler in `src/main/ipc.ts`, expose it via `contextBridge` in `src/preload/index.ts`, and add a typed wrapper in `src/renderer/src/lib/gstack-client.ts`.

### Preload must stay CJS

The preload file compiles to CJS (CommonJS). Do **not** add `"type": "module"` to `package.json` — this breaks Electron's ability to load the preload script.

### gstack boundary

gstack Studio wraps gstack — it never modifies the gstack codebase itself. It:
- Reads skill definitions from `~/.claude/skills/gstack/*/SKILL.md`
- Starts the existing browse server via `bun`
- Opens a terminal to run slash commands via the user's chosen AI coding host (Claude Code, Codex, etc.)

PRs that require modifying gstack itself are always out of scope. Changes to the gstack install path are surfaced by the user in Settings.

### Config file

User config is stored at `~/.gstack/studio-config.json`. When testing locally, you can edit this file directly to reset settings. The current config fields are: `workspacePath`, `gstackPath`, `anthropicApiKey`, `openaiApiKey`, `recentWorkspaces`, `autoStartDaemon`, `theme`, `hostBin`.

---

## Questions?

Open a [Discussion](https://github.com/arunrajiah/gstack-studio/discussions) — that's the best place for questions that aren't bugs or feature requests.
