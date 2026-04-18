declare global {
  interface Window {
    gstack: {
      daemon: {
        status:  () => Promise<DaemonState>
        start:   () => Promise<DaemonState>
        stop:    () => Promise<DaemonState>
        restart: () => Promise<DaemonState>
        logs:    () => Promise<string[]>
      }
      command:     (command: string, args?: string[]) => Promise<unknown>
      batch:       (commands: Array<{ command: string; args?: string[] }>) => Promise<unknown>
      projects:    () => Promise<GStackProject[]>
      learnings:   (slug: string) => Promise<Learning[]>
      skills:      () => Promise<Skill[]>
      copyCommand: (skillId: string) => Promise<boolean>
      workspace: {
        browse:  () => Promise<string | null>
        recents: () => Promise<string[]>
        switch:  (path: string) => Promise<{ workspacePath: string; recentWorkspaces: string[] }>
      }
      config: {
        get: () => Promise<AppConfig>
        set: (updates: Partial<AppConfig>) => Promise<AppConfig>
      }
    }
  }
}

export interface DaemonState {
  running: boolean
  port: number | null
  token: string | null
  pid: number | null
  gstackPath: string | null
  workspacePath: string | null
}

export interface GStackProject {
  slug: string
  path: string
  hasLearnings: boolean
  designs: boolean
}

export interface Learning {
  timestamp?: string
  skill?: string
  message?: string
  [key: string]: unknown
}

export interface Skill {
  id: string
  name: string
  phase: 'think' | 'plan' | 'build' | 'review' | 'test' | 'ship' | 'reflect' | 'utils'
  description: string
  icon: string
  templatePath: string
  available?: boolean
}

export interface AppConfig {
  anthropicApiKey: string
  gstackPath: string
  workspacePath: string
  openaiApiKey: string
  recentWorkspaces: string[]
}

export const client = {
  daemon: {
    status:  () => window.gstack.daemon.status(),
    start:   () => window.gstack.daemon.start(),
    stop:    () => window.gstack.daemon.stop(),
    restart: () => window.gstack.daemon.restart(),
    logs:    () => window.gstack.daemon.logs()
  },
  command:     (cmd: string, args?: string[]) => window.gstack.command(cmd, args),
  batch:       (commands: Array<{ command: string; args?: string[] }>) => window.gstack.batch(commands),
  projects:    () => window.gstack.projects(),
  learnings:   (slug: string) => window.gstack.learnings(slug),
  skills:      () => window.gstack.skills(),
  copyCommand: (skillId: string) => window.gstack.copyCommand(skillId),
  workspace: {
    browse:  () => window.gstack.workspace.browse(),
    recents: () => window.gstack.workspace.recents(),
    switch:  (path: string) => window.gstack.workspace.switch(path)
  },
  config: {
    get: () => window.gstack.config.get(),
    set: (updates: Partial<AppConfig>) => window.gstack.config.set(updates as Record<string, unknown>)
  }
}
