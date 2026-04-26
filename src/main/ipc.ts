import { IpcMain, net, clipboard, dialog, shell, app } from 'electron'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname, resolve, sep } from 'path'
import { homedir, platform } from 'os'
import { execFile, execFileSync, spawn } from 'child_process'
import { GStackDaemon } from './daemon'

// ── Input validation helpers ──────────────────────────────────────────────────

/** Reject strings that contain path-traversal sequences or null bytes. */
function isSafePathSegment(s: string): boolean {
  if (!s || typeof s !== 'string') return false
  if (s.includes('\0')) return false
  if (s.includes('..')) return false
  if (s.includes('/') || s.includes('\\')) return false
  return true
}

/** Ensure a resolved absolute path stays within a trusted root directory. */
function isWithinRoot(filePath: string, root: string): boolean {
  const rel = filePath.startsWith(root + sep) || filePath === root
  return rel
}

/** Only allow https / http URLs in shell.openExternal. */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function registerIpcHandlers(ipcMain: IpcMain, daemon: GStackDaemon): void {

  // ── Daemon ────────────────────────────────────────────────────────────────
  ipcMain.handle('daemon:status',  async () => daemon.getState())
  ipcMain.handle('daemon:start',   async () => daemon.ensureRunning())
  ipcMain.handle('daemon:stop',    async () => { await daemon.stop(); return daemon.getState() })
  ipcMain.handle('daemon:restart', async () => daemon.restart())
  ipcMain.handle('daemon:logs',    async () => daemon.getLogs())

  // ── Browse commands ───────────────────────────────────────────────────────
  ipcMain.handle('gstack:command', async (_event, command: string, args: string[] = []) => {
    const state = await daemon.getState()
    if (!state.running || !state.port || !state.token) throw new Error('Daemon not running')
    return daemonPost(state.port, state.token, '/command', { command, args })
  })

  ipcMain.handle('gstack:batch', async (_event, commands: Array<{ command: string; args?: string[] }>) => {
    const state = await daemon.getState()
    if (!state.running || !state.port || !state.token) throw new Error('Daemon not running')
    return daemonPost(state.port, state.token, '/batch', { commands })
  })

  // ── Projects & learnings ──────────────────────────────────────────────────
  ipcMain.handle('gstack:projects', async () => {
    const projectsDir = join(homedir(), '.gstack', 'projects')
    if (!existsSync(projectsDir)) return []
    const { readdirSync, statSync } = await import('fs')
    return readdirSync(projectsDir)
      .filter(f => { try { return statSync(join(projectsDir, f)).isDirectory() } catch { return false } })
      .map(slug => ({
        slug,
        path: join(projectsDir, slug),
        hasLearnings: existsSync(join(projectsDir, slug, 'learnings.jsonl')),
        designs: existsSync(join(projectsDir, slug, 'designs'))
      }))
  })

  ipcMain.handle('gstack:learnings', async (_event, slug: string) => {
    // Prevent path traversal — slug must be a single safe directory name
    if (!isSafePathSegment(slug) || !/^[a-zA-Z0-9._-]+$/.test(slug)) return []
    const projectsRoot = join(homedir(), '.gstack', 'projects')
    const file = resolve(projectsRoot, slug, 'learnings.jsonl')
    if (!isWithinRoot(file, projectsRoot)) return []
    if (!existsSync(file)) return []
    return readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line) } catch { return null } })
      .filter(Boolean)
      .reverse()
  })

  // ── Skills ────────────────────────────────────────────────────────────────
  ipcMain.handle('gstack:skills', async () => {
    const gstackPath = daemon.gstackPath
    if (!gstackPath) return loadSkillsFromDisk(null)
    return loadSkillsFromDisk(gstackPath)
  })

  ipcMain.handle('skill:copy-command', async (_event, skillId: string) => {
    clipboard.writeText(`/${skillId}`)
    return true
  })

  // ── Workspace management ──────────────────────────────────────────────────
  /** Open a native folder-picker; returns the chosen path or null if cancelled. */
  ipcMain.handle('workspace:browse', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Workspace Directory',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  /** Most-recent-first list of workspace paths (max 5). */
  ipcMain.handle('workspace:recents', async () => getConfig().recentWorkspaces ?? [])

  /**
   * Switch active workspace: saves workspacePath and updates recentWorkspaces.
   * Daemon restart is left to the caller.
   */
  ipcMain.handle('workspace:switch', async (_event, workspacePath: string) => {
    const config = getConfig()
    const recentWorkspaces = addToRecents(config.recentWorkspaces ?? [], workspacePath)
    saveConfig({ ...config, workspacePath, recentWorkspaces })
    return { workspacePath, recentWorkspaces }
  })

  // ── Shell / OS integration ────────────────────────────────────────────────
  /** Open a path in Finder / Explorer / Files */
  ipcMain.handle('shell:open-path', async (_event, p: string) => shell.openPath(p))

  /** Open a URL in the default browser — only http/https allowed */
  ipcMain.handle('shell:open-url', async (_event, url: string) => {
    if (!isSafeUrl(url)) return
    return shell.openExternal(url)
  })

  /** Read a skill's SKILL.md template and return its content */
  ipcMain.handle('skill:read-doc', async (_event, skillId: string) => {
    const gstackPath = daemon.gstackPath
    if (!gstackPath) return null
    // Validate skillId — only alphanumeric, hyphens, underscores (no traversal)
    if (!skillId || !/^[a-zA-Z0-9_-]+$/.test(skillId)) return null
    const candidates = [
      resolve(gstackPath, skillId, 'SKILL.md'),
      // Replace hyphens with path separator for nested skill dirs only if safe
      resolve(gstackPath, ...skillId.split('-'), 'SKILL.md'),
    ]
    for (const p of candidates) {
      // Ensure the resolved path stays within the gstack install directory
      if (!isWithinRoot(p, gstackPath)) continue
      if (existsSync(p)) return readFileSync(p, 'utf8')
    }
    return null
  })

  /** Return the app version */
  ipcMain.handle('app:version', async () => app.getVersion())


  // ── Host detection & execution ────────────────────────────────────────────
  /** Detect installed AI coding hosts and return their resolved paths */
  ipcMain.handle('host:detect', async () => detectHosts())

  /**
   * Run a skill in a terminal window using the configured host.
   * Opens a real interactive terminal so the user can watch and respond.
   */
  ipcMain.handle('skill:execute', async (_event, skillId: string, hostBin: string) => {
    const cfg = getConfig()
    const cwd = cfg.workspacePath || homedir()
    const cmd = `/${skillId}`

    // Copy command to clipboard as a backup
    clipboard.writeText(cmd)

    return openTerminalWithCommand(cwd, hostBin, cmd)
  })

  // ── Config ────────────────────────────────────────────────────────────────
  ipcMain.handle('config:get', async () => getConfig())

  ipcMain.handle('config:set', async (_event, updates: Record<string, unknown>) => {
    // Whitelist — only known config keys accepted; arbitrary keys are dropped
    const ALLOWED: ReadonlyArray<keyof AppConfig> = [
      'anthropicApiKey', 'gstackPath', 'workspacePath', 'openaiApiKey',
      'recentWorkspaces', 'autoStartDaemon', 'theme', 'hostBin',
    ]
    const safe: Partial<AppConfig> = {}
    for (const k of ALLOWED) {
      if (k in updates) (safe as Record<string, unknown>)[k] = updates[k]
    }
    const merged = { ...getConfig(), ...safe } as AppConfig
    saveConfig(merged)
    return merged
  })

  // ── Bun check ─────────────────────────────────────────────────────────────
  /** Check whether Bun is installed and return its resolved path. */
  ipcMain.handle('bun:check', async () => {
    const bunPaths = [
      join(homedir(), '.bun', 'bin', 'bun'),
      '/usr/local/bin/bun',
      '/opt/homebrew/bin/bun',
    ]
    for (const b of bunPaths) {
      if (existsSync(b)) return { found: true, path: b }
    }
    try {
      const result = execFileSync('which', ['bun'], { encoding: 'utf8' }).trim()
      if (result) return { found: true, path: result }
    } catch { /* not in PATH */ }
    return { found: false, path: null }
  })

  // ── gstack install helpers ────────────────────────────────────────────────

  /**
   * Check whether a path looks like a valid gstack install.
   * Returns true if the directory exists and contains at least one SKILL.md.
   */
  ipcMain.handle('gstack:check', async (_event, gstackPath: string) => {
    if (!gstackPath || !existsSync(gstackPath)) return false
    try {
      const { readdirSync } = await import('fs')
      const entries = readdirSync(gstackPath)
      return entries.some(e => {
        try {
          return existsSync(join(gstackPath, e, 'SKILL.md'))
        } catch { return false }
      })
    } catch { return false }
  })

  /**
   * Clone gstack from GitHub into targetPath.
   * Uses a shallow clone (--depth 1) for speed.
   * Returns { success: true, path } or { success: false, error: string }.
   */
  ipcMain.handle('gstack:install', async (_event, targetPath: string) => {
    const resolvedPath = targetPath.replace(/^~/, homedir())
    try {
      mkdirSync(dirname(resolvedPath), { recursive: true })
    } catch { /* parent may already exist */ }

    return new Promise<{ success: boolean; path: string; error?: string }>(resolve => {
      const child = spawn(
        'git',
        ['clone', '--depth', '1', 'https://github.com/garrytan/gstack', resolvedPath],
        { stdio: 'pipe' }
      )
      const errBuf: string[] = []
      child.stderr?.on('data', (d: Buffer) => errBuf.push(d.toString()))
      child.on('close', code => {
        if (code === 0) {
          resolve({ success: true, path: resolvedPath })
        } else {
          resolve({ success: false, path: resolvedPath, error: errBuf.join('').trim() || `git exited with code ${code}` })
        }
      })
      child.on('error', err => {
        resolve({ success: false, path: resolvedPath, error: `git not found: ${err.message}. Install git and try again.` })
      })
    })
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daemonPost(port: number, token: string, path: string, body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: 'POST', url: `http://127.0.0.1:${port}${path}` })
    req.setHeader('Content-Type', 'application/json')
    req.setHeader('Authorization', `Bearer ${token}`)
    let data = ''
    req.on('response', res => {
      res.on('data', chunk => (data += chunk))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

export interface AppConfig {
  anthropicApiKey: string
  gstackPath: string
  workspacePath: string
  openaiApiKey: string
  recentWorkspaces: string[]
  autoStartDaemon: boolean
  theme: 'dark' | 'light' | 'system'
  /** Resolved path to the preferred AI coding host binary (claude, codex, etc.) */
  hostBin: string
}

function configPath(): string { return join(homedir(), '.gstack', 'studio-config.json') }

function getConfig(): AppConfig {
  try {
    if (existsSync(configPath())) {
      const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<AppConfig>
      return {
        anthropicApiKey:  raw.anthropicApiKey  ?? '',
        gstackPath:       raw.gstackPath       ?? '',
        workspacePath:    raw.workspacePath     ?? '',
        openaiApiKey:     raw.openaiApiKey      ?? '',
        recentWorkspaces: raw.recentWorkspaces  ?? [],
        autoStartDaemon:  raw.autoStartDaemon   ?? false,
        theme:            (raw.theme as AppConfig['theme']) ?? 'dark',
        hostBin:          raw.hostBin           ?? ''
      }
    }
  } catch { /* ignore */ }
  return { anthropicApiKey: '', gstackPath: '', workspacePath: '', openaiApiKey: '', recentWorkspaces: [], autoStartDaemon: false, theme: 'dark', hostBin: '' }
}

function saveConfig(config: AppConfig): void {
  mkdirSync(join(homedir(), '.gstack'), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 })
}

function addToRecents(current: string[], path: string): string[] {
  return [path, ...current.filter(p => p !== path)].slice(0, 5)
}

// ── Host detection ────────────────────────────────────────────────────────────

export interface DetectedHost {
  id: string
  label: string
  bin: string
  available: boolean
}

const HOST_CANDIDATES: Array<{ id: string; label: string; bins: string[] }> = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    bins: [
      join(homedir(), '.local', 'bin', 'claude'),
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      'claude',
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    bins: [
      join(homedir(), '.local', 'bin', 'codex'),
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
      'codex',
    ],
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    bins: [
      join(homedir(), '.local', 'bin', 'openclaw'),
      '/usr/local/bin/openclaw',
      'openclaw',
    ],
  },
  {
    id: 'factory',
    label: 'Factory',
    bins: [
      join(homedir(), '.local', 'bin', 'factory'),
      '/usr/local/bin/factory',
      'factory',
    ],
  },
  {
    id: 'kiro',
    label: 'Kiro',
    bins: [
      join(homedir(), '.local', 'bin', 'kiro'),
      '/usr/local/bin/kiro',
      'kiro',
    ],
  },
]

function resolveHostBin(bins: string[]): string | null {
  for (const b of bins) {
    if (b !== bins[bins.length - 1] && existsSync(b)) return b
  }
  // For the bare name, check PATH via `which` — use execFile to avoid shell injection
  try {
    const result = execFileSync('which', [bins[bins.length - 1]], { encoding: 'utf8' }).trim()
    if (result) return result
  } catch { /* not in PATH */ }
  return null
}

function detectHosts(): DetectedHost[] {
  return HOST_CANDIDATES.map(({ id, label, bins }) => {
    const bin = resolveHostBin(bins)
    return { id, label, bin: bin ?? bins[0], available: bin !== null }
  })
}

// ── Terminal launcher ─────────────────────────────────────────────────────────

function escShell(s: string): string {
  return s.replace(/'/g, "'\\''")
}

function openTerminalWithCommand(cwd: string, hostBin: string, skillCmd: string): Promise<void> {
  const p = platform()
  // The full shell command to run inside the terminal
  const shellCmd = `cd '${escShell(cwd)}' && '${escShell(hostBin)}' '${escShell(skillCmd)}'`

  return new Promise((resolve, reject) => {
    if (p === 'darwin') {
      // Build the AppleScript — pass it via execFile (not exec) to avoid shell injection
      const script = `
        set cmd to "cd '${escShell(cwd)}' && '${escShell(hostBin)}' '${escShell(skillCmd)}'"
        tell application "System Events"
          set iTermRunning to (name of processes) contains "iTerm2"
        end tell
        if iTermRunning then
          tell application "iTerm2"
            activate
            set newWindow to (create window with default profile)
            tell current session of newWindow to write text cmd
          end tell
        else
          tell application "Terminal"
            activate
            do script cmd
          end tell
        end if
      `
      // Use execFile so the script is passed as a direct arg, not through the shell
      execFile('osascript', ['-e', script], err => {
        if (err) { reject(err) } else { resolve() }
      })
    } else if (p === 'win32') {
      // Escape double quotes inside each value before embedding in the cmd string
      const esc = (s: string) => s.replace(/"/g, '\\"')
      const winCmd = `cd /d "${esc(cwd)}" && "${esc(hostBin)}" "${esc(skillCmd)}"`
      execFile('cmd.exe', ['/K', winCmd], err => {
        if (err) { reject(err) } else { resolve() }
      })
    } else {
      // Linux — try common terminal emulators in order
      const terminals = [
        ['gnome-terminal', '--', 'bash', '-c', `${shellCmd}; exec bash`],
        ['xterm', '-e', `bash -c '${escShell(shellCmd)}; exec bash'`],
        ['konsole', '--hold', '-e', 'bash', '-c', shellCmd],
        ['xfce4-terminal', '--hold', '-e', `bash -c '${escShell(shellCmd)}'`],
      ]
      const tryNext = (i: number) => {
        if (i >= terminals.length) { reject(new Error('No terminal emulator found')); return }
        const [cmd, ...args] = terminals[i]
        execFile(cmd, args, { cwd }, err => {
          if (err) { tryNext(i + 1) } else { resolve() }
        })
      }
      tryNext(0)
    }
  })
}

// ── Dynamic skill loader ──────────────────────────────────────────────────────
// Reads skills directly from the gstack install on disk so the app stays in
// sync automatically whenever the user runs /gstack-upgrade.

/**
 * Per-skill decoration: phase placement and icon.
 * Description and name come from SKILL.md frontmatter at runtime.
 * Unknown skills fall back to phase=utils, icon=🔧.
 */
const SKILL_DECORATION: Record<string, { phase: string; icon: string; displayName?: string }> = {
  'office-hours':        { phase: 'think',   icon: '💬', displayName: 'Office Hours' },
  'autoplan':            { phase: 'plan',    icon: '🗺️', displayName: 'Auto Plan' },
  'plan-ceo-review':     { phase: 'plan',    icon: '🎯', displayName: 'CEO Review' },
  'plan-eng-review':     { phase: 'plan',    icon: '⚙️', displayName: 'Eng Review' },
  'plan-design-review':  { phase: 'plan',    icon: '🎨', displayName: 'Design Review' },
  'plan-devex-review':   { phase: 'plan',    icon: '🔧', displayName: 'DevEx Review' },
  'design-consultation': { phase: 'plan',    icon: '🖌️', displayName: 'Design Consultation' },
  'design-shotgun':      { phase: 'build',   icon: '🔫', displayName: 'Design Shotgun' },
  'design-html':         { phase: 'build',   icon: '📐', displayName: 'Design HTML' },
  'review':              { phase: 'review',  icon: '🔍', displayName: 'Code Review' },
  'investigate':         { phase: 'review',  icon: '🔎', displayName: 'Investigate' },
  'design-review':       { phase: 'review',  icon: '🎨', displayName: 'Design Review' },
  'devex-review':        { phase: 'review',  icon: '🛠️', displayName: 'DevEx Review' },
  'cso':                 { phase: 'review',  icon: '🔒', displayName: 'Security Audit' },
  'codex':               { phase: 'review',  icon: '🤖', displayName: 'Codex Review' },
  'qa':                  { phase: 'test',    icon: '🧪', displayName: 'QA' },
  'qa-only':             { phase: 'test',    icon: '📋', displayName: 'QA Report' },
  'benchmark':           { phase: 'test',    icon: '📊', displayName: 'Benchmark' },
  'benchmark-models':    { phase: 'test',    icon: '🤖', displayName: 'Benchmark Models' },
  'ship':                { phase: 'ship',    icon: '🚀', displayName: 'Ship' },
  'land-and-deploy':     { phase: 'ship',    icon: '🛬', displayName: 'Land & Deploy' },
  'canary':              { phase: 'ship',    icon: '🐦', displayName: 'Canary' },
  'document-release':    { phase: 'reflect', icon: '📝', displayName: 'Document Release' },
  'retro':               { phase: 'reflect', icon: '🔄', displayName: 'Retro' },
  'health':              { phase: 'utils',   icon: '❤️', displayName: 'Health' },
  'learn':               { phase: 'utils',   icon: '🧠', displayName: 'Learn' },
  'pair-agent':          { phase: 'utils',   icon: '👥', displayName: 'Pair Agent' },
  'careful':             { phase: 'utils',   icon: '⚠️', displayName: 'Careful Mode' },
  'freeze':              { phase: 'utils',   icon: '🧊', displayName: 'Freeze' },
  'unfreeze':            { phase: 'utils',   icon: '🌡️', displayName: 'Unfreeze' },
  'guard':               { phase: 'utils',   icon: '🛡️', displayName: 'Guard' },
  'gstack-upgrade':      { phase: 'utils',   icon: '⬆️', displayName: 'gstack Upgrade' },
  'context-save':        { phase: 'utils',   icon: '💾', displayName: 'Context Save' },
  'context-restore':     { phase: 'utils',   icon: '⏪', displayName: 'Context Restore' },
  'open-gstack-browser': { phase: 'utils',   icon: '🌐', displayName: 'Open Browser' },
  'setup-browser-cookies': { phase: 'utils', icon: '🍪', displayName: 'Setup Cookies' },
  'setup-deploy':        { phase: 'utils',   icon: '🚢', displayName: 'Setup Deploy' },
  'make-pdf':            { phase: 'utils',   icon: '📄', displayName: 'Make PDF' },
  'plan-tune':           { phase: 'plan',    icon: '🎛️', displayName: 'Plan Tune' },
  'landing-report':      { phase: 'ship',    icon: '📋', displayName: 'Landing Report' },
  'setup-gbrain':        { phase: 'utils',   icon: '🧠', displayName: 'Setup GBrain' },
}

/** Dirs inside the gstack repo that are not skills */
const NON_SKILL_DIRS = new Set([
  '.github', 'agents', 'bin', 'browse', 'contrib', 'docs', 'extension',
  'hosts', 'lib', 'model-overlays', 'openclaw', 'scripts', 'supabase',
  'test', 'plan', 'design',
])

/** Pull the first non-empty line out of a YAML multiline `|` block */
function firstLine(block: string): string {
  return block.split('\n').map(l => l.trim()).filter(Boolean)[0] ?? ''
}

/** Parse `name` and `description` from a SKILL.md YAML frontmatter block */
function parseSkillFrontmatter(content: string): { name: string; description: string } {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? ''
  // description is a multiline `|` block — grab everything indented after it
  const descBlock = fm.match(/^description:\s*\|\r?\n([\s\S]*?)(?=\n\S|\n?$)/m)?.[1] ?? ''
  const description = firstLine(descBlock)
  return { name, description }
}

/** Humanise a kebab-case id when we have no displayName for it */
function humanise(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function loadSkillsFromDisk(gstackPath: string | null) {
  if (!gstackPath) {
    // Return decoration map as fallback stubs (no available flag)
    return Object.entries(SKILL_DECORATION).map(([id, meta]) => ({
      id,
      name: meta.displayName ?? humanise(id),
      phase: meta.phase,
      description: '',
      icon: meta.icon,
      available: false,
    }))
  }

  const { readdirSync, statSync } = require('fs') as typeof import('fs')
  const skillDirs: string[] = []
  try {
    skillDirs.push(
      ...readdirSync(gstackPath).filter((entry: string) => {
        if (NON_SKILL_DIRS.has(entry)) return false
        try { return statSync(join(gstackPath, entry)).isDirectory() } catch { return false }
      })
    )
  } catch { /* gstackPath not readable */ }

  const skills = skillDirs
    .map(dir => {
      const skillMdPath = join(gstackPath, dir, 'SKILL.md')
      if (!existsSync(skillMdPath)) return null
      let parsed = { name: dir, description: '' }
      try { parsed = parseSkillFrontmatter(readFileSync(skillMdPath, 'utf8')) } catch { /* ignore */ }
      const id = parsed.name || dir
      const deco = SKILL_DECORATION[id] ?? { phase: 'utils', icon: '🔧' }
      return {
        id,
        name: deco.displayName ?? humanise(id),
        phase: deco.phase,
        description: parsed.description,
        icon: deco.icon,
        available: true,
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  // Stable sort: phase order then alpha within phase
  const PHASE_ORDER = ['think','plan','build','review','test','ship','reflect','utils']
  return skills.sort((a, b) => {
    const pi = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
    return pi !== 0 ? pi : a.id.localeCompare(b.id)
  })
}
