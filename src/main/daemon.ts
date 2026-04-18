import { spawn, ChildProcess } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { net } from 'electron'

export interface DaemonState {
  running: boolean
  port: number | null
  token: string | null
  pid: number | null
  gstackPath: string | null
  workspacePath: string | null
}

interface BrowseJson {
  port: number
  token: string
  pid: number
}

interface SavedConfig {
  gstackPath?: string
  workspacePath?: string
}

const MAX_LOGS = 500

export class GStackDaemon {
  private proc: ChildProcess | null = null
  private healthTimer: NodeJS.Timeout | null = null
  private _logs: string[] = []

  private addLog(line: string): void {
    this._logs.push(line)
    if (this._logs.length > MAX_LOGS) this._logs.shift()
  }

  getLogs(): string[] {
    return [...this._logs]
  }

  private readSavedConfig(): SavedConfig {
    try {
      const p = join(homedir(), '.gstack', 'studio-config.json')
      if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')) as SavedConfig
    } catch { /* ignore */ }
    return {}
  }

  get gstackPath(): string | null {
    const saved = this.readSavedConfig().gstackPath
    if (saved && existsSync(saved)) return saved
    const candidates = [
      join(homedir(), '.claude', 'skills', 'gstack'),
      join(homedir(), '.gstack', 'skills', 'gstack')
    ]
    return candidates.find(p => existsSync(p)) ?? null
  }

  get workspacePath(): string {
    return this.readSavedConfig().workspacePath || homedir()
  }

  get browseJsonPath(): string {
    return join(this.workspacePath, '.gstack', 'browse.json')
  }

  readBrowseJson(): BrowseJson | null {
    try {
      if (!existsSync(this.browseJsonPath)) return null
      return JSON.parse(readFileSync(this.browseJsonPath, 'utf8')) as BrowseJson
    } catch {
      return null
    }
  }

  async isHealthy(port: number, token: string): Promise<boolean> {
    return new Promise(resolve => {
      const req = net.request(`http://127.0.0.1:${port}/health`)
      req.setHeader('Authorization', `Bearer ${token}`)
      req.on('response', res => resolve(res.statusCode === 200))
      req.on('error', () => resolve(false))
      req.end()
    })
  }

  async getState(): Promise<DaemonState> {
    const state: DaemonState = {
      running: false,
      port: null,
      token: null,
      pid: null,
      gstackPath: this.gstackPath,
      workspacePath: this.workspacePath
    }
    const browse = this.readBrowseJson()
    if (!browse) return state
    state.port = browse.port
    state.token = browse.token
    state.pid = browse.pid
    state.running = await this.isHealthy(browse.port, browse.token)
    return state
  }

  async ensureRunning(): Promise<DaemonState> {
    const state = await this.getState()
    if (state.running) return state
    const gstackPath = this.gstackPath
    if (!gstackPath) {
      throw new Error(
        'gstack not found. Set the gstack path in Settings or install from https://github.com/garrytan/gstack'
      )
    }
    return this.start(gstackPath)
  }

  async restart(): Promise<DaemonState> {
    this.addLog(`${ts()} [studio] Restarting daemon…`)
    await this.stop()
    const gstackPath = this.gstackPath
    if (!gstackPath) throw new Error('gstack not configured. Set the path in Settings.')
    return this.start(gstackPath)
  }

  private async start(gstackPath: string): Promise<DaemonState> {
    const bunBin = await this.findBun()
    const serverScript = join(gstackPath, 'browse', 'src', 'server.ts')

    if (!existsSync(serverScript)) {
      throw new Error(
        `gstack browse server not found at ${serverScript}. ` +
        `Expected browse/src/server.ts inside ${gstackPath}`
      )
    }

    this.addLog(`${ts()} [studio] Starting daemon — workspace: ${this.workspacePath}`)

    this.proc = spawn(bunBin, ['run', serverScript], {
      cwd: this.workspacePath,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    this.proc.stdout?.on('data', d => {
      const line = d.toString().trim()
      if (line) {
        console.log('[gstack daemon]', line)
        this.addLog(`${ts()} [out] ${line}`)
      }
    })

    this.proc.stderr?.on('data', d => {
      const line = d.toString().trim()
      if (line) {
        console.error('[gstack daemon]', line)
        this.addLog(`${ts()} [err] ${line}`)
      }
    })

    this.proc.on('exit', code => {
      const msg = `[studio] Daemon exited — code ${code}`
      console.log(msg)
      this.addLog(`${ts()} ${msg}`)
      this.proc = null
    })

    // Wait up to 6 s for browse.json + health OK
    for (let i = 0; i < 30; i++) {
      await sleep(200)
      const state = await this.getState()
      if (state.running) {
        this.addLog(`${ts()} [studio] Daemon healthy on port ${state.port}`)
        this.startHealthMonitor()
        return state
      }
    }
    throw new Error('gstack daemon failed to start within 6 seconds')
  }

  private startHealthMonitor(): void {
    if (this.healthTimer) clearInterval(this.healthTimer)
    this.healthTimer = setInterval(async () => {
      const state = await this.getState()
      if (!state.running && this.gstackPath) {
        this.addLog(`${ts()} [studio] Daemon unhealthy — restarting`)
        this.start(this.gstackPath).catch(console.error)
      }
    }, 15_000)
  }

  async stop(): Promise<void> {
    if (this.healthTimer) { clearInterval(this.healthTimer); this.healthTimer = null }
    if (this.proc) {
      this.addLog(`${ts()} [studio] Stopping daemon`)
      this.proc.kill('SIGTERM')
      this.proc = null
    }
  }

  private async findBun(): Promise<string> {
    const candidates = [
      join(homedir(), '.bun', 'bin', 'bun'),
      '/usr/local/bin/bun',
      '/opt/homebrew/bin/bun',
      'bun'
    ]
    for (const p of candidates) {
      if (p === 'bun' || existsSync(p)) return p
    }
    return 'bun'
  }
}

function ts(): string {
  return new Date().toLocaleTimeString('en', { hour12: false })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
