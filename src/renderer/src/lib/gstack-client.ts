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
      command:      (command: string, args?: string[]) => Promise<unknown>
      batch:        (commands: Array<{ command: string; args?: string[] }>) => Promise<unknown>
      projects:     () => Promise<GStackProject[]>
      learnings:    (slug: string) => Promise<Learning[]>
      skills:        () => Promise<Skill[]>
      copyCommand:   (skillId: string) => Promise<boolean>
      readSkillDoc:  (skillId: string) => Promise<string | null>
      executeSkill:  (skillId: string, hostBin: string) => Promise<void>
      checkGstack:   (path: string) => Promise<boolean>
      installGstack: (targetPath: string) => Promise<{ success: boolean; path: string; error?: string }>
      workspace: {
        browse:  () => Promise<string | null>
        recents: () => Promise<string[]>
        switch:  (path: string) => Promise<{ workspacePath: string; recentWorkspaces: string[] }>
      }
      window: {
        minimize:    () => Promise<void>
        maximize:    () => Promise<void>
        close:       () => Promise<void>
        isMaximized: () => Promise<boolean>
      }
      updater: {
        check:       () => Promise<unknown>
        download:    () => Promise<void>
        install:     () => Promise<void>
        onAvailable: (cb: (info: { version: string }) => void) => void
        onReady:     (cb: () => void) => void
      }
      shell: {
        openPath: (p: string) => Promise<string>
        openUrl:  (url: string) => Promise<void>
      }
      appVersion: () => Promise<string>
      host: {
        detect: () => Promise<DetectedHost[]>
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
  autoStartDaemon: boolean
  theme: 'dark' | 'light' | 'system'
  /** Resolved path to the preferred AI coding host binary (claude, codex, etc.) */
  hostBin: string
}

export interface DetectedHost {
  id: string
  label: string
  bin: string
  available: boolean
}

export const client = {
  daemon: {
    status:  () => window.gstack.daemon.status(),
    start:   () => window.gstack.daemon.start(),
    stop:    () => window.gstack.daemon.stop(),
    restart: () => window.gstack.daemon.restart(),
    logs:    () => window.gstack.daemon.logs()
  },
  command:      (cmd: string, args?: string[]) => window.gstack.command(cmd, args),
  batch:        (commands: Array<{ command: string; args?: string[] }>) => window.gstack.batch(commands),
  projects:     () => window.gstack.projects(),
  learnings:    (slug: string) => window.gstack.learnings(slug),
  skills:        () => window.gstack.skills(),
  copyCommand:   (skillId: string) => window.gstack.copyCommand(skillId),
  readSkillDoc:  (skillId: string) => window.gstack.readSkillDoc(skillId),
  executeSkill:  (skillId: string, hostBin: string) => window.gstack.executeSkill(skillId, hostBin),
  checkGstack:   (path: string) => window.gstack.checkGstack(path),
  installGstack: (targetPath: string) => window.gstack.installGstack(targetPath),
  workspace: {
    browse:  () => window.gstack.workspace.browse(),
    recents: () => window.gstack.workspace.recents(),
    switch:  (path: string) => window.gstack.workspace.switch(path)
  },
  window: {
    minimize:    () => window.gstack.window.minimize(),
    maximize:    () => window.gstack.window.maximize(),
    close:       () => window.gstack.window.close(),
    isMaximized: () => window.gstack.window.isMaximized()
  },
  updater: {
    check:       () => window.gstack.updater.check(),
    download:    () => window.gstack.updater.download(),
    install:     () => window.gstack.updater.install(),
    onAvailable: (cb: (info: { version: string }) => void) => window.gstack.updater.onAvailable(cb),
    onReady:     (cb: () => void) => window.gstack.updater.onReady(cb)
  },
  shell: {
    openPath: (p: string) => window.gstack.shell.openPath(p),
    openUrl:  (url: string) => window.gstack.shell.openUrl(url)
  },
  appVersion: () => window.gstack.appVersion(),
  host: {
    detect: () => window.gstack.host.detect(),
  },
  config: {
    get: () => window.gstack.config.get(),
    set: (updates: Partial<AppConfig>) => window.gstack.config.set(updates as Record<string, unknown>)
  }
}
