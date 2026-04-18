import { IpcMain, net, clipboard, dialog } from 'electron'
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
    if (!gstackPath) return BUILTIN_SKILLS.map(s => ({ ...s, available: false }))
    return BUILTIN_SKILLS.map(skill => ({
      ...skill,
      available: existsSync(join(gstackPath, skill.templatePath))
    }))
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
        recentWorkspaces: raw.recentWorkspaces  ?? []
      }
    }
  } catch { /* ignore */ }
  return { anthropicApiKey: '', gstackPath: '', workspacePath: '', openaiApiKey: '', recentWorkspaces: [] }
}

function saveConfig(config: AppConfig): void {
  mkdirSync(join(homedir(), '.gstack'), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 })
}

function addToRecents(current: string[], path: string): string[] {
  return [path, ...current.filter(p => p !== path)].slice(0, 5)
}

// ── Built-in skill catalogue ──────────────────────────────────────────────────

const BUILTIN_SKILLS = [
  // THINK
  { id: 'office-hours',        name: 'Office Hours',        phase: 'think',   description: 'Product interrogation — 6 diagnostic questions, design doc output',           icon: '💬', templatePath: 'office-hours/SKILL.md' },
  // PLAN
  { id: 'autoplan',            name: 'Auto Plan',           phase: 'plan',    description: '4-phase automated review: CEO → Design → Engineering → DevEx',               icon: '🗺️', templatePath: 'autoplan/SKILL.md' },
  { id: 'plan-ceo-review',     name: 'CEO Review',          phase: 'plan',    description: 'Strategic scope analysis — strongest product potential',                      icon: '🎯', templatePath: 'plan/SKILL.md' },
  { id: 'plan-eng-review',     name: 'Eng Review',          phase: 'plan',    description: 'Architecture, data flow, edge cases, testing strategy',                       icon: '⚙️', templatePath: 'plan/SKILL.md' },
  { id: 'plan-design-review',  name: 'Design Review',       phase: 'plan',    description: 'Design system audit with 0-10 scoring',                                      icon: '🎨', templatePath: 'design/SKILL.md' },
  { id: 'design-consultation', name: 'Design Consultation', phase: 'plan',    description: 'Build a complete design system from scratch',                                 icon: '🖌️', templatePath: 'design/SKILL.md' },
  // BUILD
  { id: 'design-shotgun',      name: 'Design Shotgun',      phase: 'build',   description: '4-6 UI mockup variants in parallel',                                         icon: '🔫', templatePath: 'design/SKILL.md' },
  { id: 'design-html',         name: 'Design HTML',         phase: 'build',   description: 'Production-ready HTML/CSS generation',                                       icon: '📐', templatePath: 'design/SKILL.md' },
  // REVIEW
  { id: 'review',              name: 'Code Review',         phase: 'review',  description: 'Pre-merge review — catches bugs, auto-fixes obvious issues',                 icon: '🔍', templatePath: 'review/SKILL.md' },
  { id: 'debug',               name: 'Debug',               phase: 'review',  description: 'Systematic root-cause analysis before applying fixes',                       icon: '🐛', templatePath: 'review/SKILL.md' },
  { id: 'cso',                 name: 'Security Audit',      phase: 'review',  description: '14-phase security audit: OWASP Top 10, STRIDE, supply chain',               icon: '🔒', templatePath: 'review/SKILL.md' },
  { id: 'codex',               name: 'Codex Review',        phase: 'review',  description: 'OpenAI cross-model independent review',                                      icon: '🤖', templatePath: 'review/SKILL.md' },
  // TEST
  { id: 'qa',                  name: 'QA',                  phase: 'test',    description: 'Browser-based testing — finds bugs, auto-fixes, generates regression tests',  icon: '🧪', templatePath: 'qa/SKILL.md' },
  { id: 'qa-only',             name: 'QA Report',           phase: 'test',    description: 'QA report only — no code changes',                                           icon: '📋', templatePath: 'qa/SKILL.md' },
  // SHIP
  { id: 'ship',                name: 'Ship',                phase: 'ship',    description: 'Run tests, audit coverage, create PR',                                       icon: '🚀', templatePath: 'ship/SKILL.md' },
  { id: 'land-and-deploy',     name: 'Land & Deploy',       phase: 'ship',    description: 'Merge, deploy to production, verify',                                        icon: '🛬', templatePath: 'ship/SKILL.md' },
  { id: 'canary',              name: 'Canary',              phase: 'ship',    description: 'Post-deploy monitoring',                                                     icon: '🐦', templatePath: 'ship/SKILL.md' },
  // REFLECT
  { id: 'document-release',    name: 'Document Release',    phase: 'reflect', description: 'Post-ship docs sync: README, ARCHITECTURE, CHANGELOG',                      icon: '📝', templatePath: 'document/SKILL.md' },
  { id: 'retro',               name: 'Retro',               phase: 'reflect', description: 'Weekly retrospective with commit analysis and metrics',                      icon: '🔄', templatePath: 'retro/SKILL.md' },
  // UTILS
  { id: 'health',              name: 'Health',              phase: 'utils',   description: 'Code quality dashboard: type errors, lint, tests, dead code',               icon: '❤️', templatePath: 'health/SKILL.md' },
  { id: 'learn',               name: 'Learn',               phase: 'utils',   description: 'Persist learnings to project memory',                                       icon: '🧠', templatePath: 'learn/SKILL.md' },
  { id: 'pair-agent',          name: 'Pair Agent',          phase: 'utils',   description: 'Multi-agent coordination via shared browser',                               icon: '👥', templatePath: 'pair/SKILL.md' },
  { id: 'careful',             name: 'Careful Mode',        phase: 'utils',   description: 'Warnings for destructive operations (rm -rf, DROP TABLE, etc.)',            icon: '⚠️', templatePath: 'careful/SKILL.md' },
]
