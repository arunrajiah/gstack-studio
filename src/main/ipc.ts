import { IpcMain, net, clipboard, dialog, shell, app } from 'electron'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { GStackDaemon } from './daemon'

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
    const file = join(homedir(), '.gstack', 'projects', slug, 'learnings.jsonl')
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

  /** Open a URL in the default browser */
  ipcMain.handle('shell:open-url', async (_event, url: string) => shell.openExternal(url))

  /** Read a skill's SKILL.md template and return its content */
  ipcMain.handle('skill:read-doc', async (_event, skillId: string) => {
    const gstackPath = daemon.gstackPath
    if (!gstackPath) return null
    // Try common locations for skill docs
    const candidates = [
      join(gstackPath, skillId, 'SKILL.md'),
      join(gstackPath, skillId.replace(/-/g, '/'), 'SKILL.md'),
    ]
    for (const p of candidates) {
      if (existsSync(p)) return readFileSync(p, 'utf8')
    }
    return null
  })

  /** Return the app version */
  ipcMain.handle('app:version', async () => app.getVersion())

  // ── Config ────────────────────────────────────────────────────────────────
  ipcMain.handle('config:get', async () => getConfig())

  ipcMain.handle('config:set', async (_event, updates: Record<string, unknown>) => {
    const merged = { ...getConfig(), ...updates } as AppConfig
    saveConfig(merged)
    return merged
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
  theme: 'dark' | 'light' | 'system'
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
        theme:            (raw.theme as AppConfig['theme']) ?? 'dark'
      }
    }
  } catch { /* ignore */ }
  return { anthropicApiKey: '', gstackPath: '', workspacePath: '', openaiApiKey: '', recentWorkspaces: [], theme: 'dark' }
}

function saveConfig(config: AppConfig): void {
  mkdirSync(join(homedir(), '.gstack'), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 })
}

function addToRecents(current: string[], path: string): string[] {
  return [path, ...current.filter(p => p !== path)].slice(0, 5)
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
  'debug':               { phase: 'review',  icon: '🐛', displayName: 'Debug' },
  'investigate':         { phase: 'review',  icon: '🔎', displayName: 'Investigate' },
  'design-review':       { phase: 'review',  icon: '🎨', displayName: 'Design Review' },
  'devex-review':        { phase: 'review',  icon: '🛠️', displayName: 'DevEx Review' },
  'cso':                 { phase: 'review',  icon: '🔒', displayName: 'Security Audit' },
  'codex':               { phase: 'review',  icon: '🤖', displayName: 'Codex Review' },
  'qa':                  { phase: 'test',    icon: '🧪', displayName: 'QA' },
  'qa-only':             { phase: 'test',    icon: '📋', displayName: 'QA Report' },
  'benchmark':           { phase: 'test',    icon: '📊', displayName: 'Benchmark' },
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
