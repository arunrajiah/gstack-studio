import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gstack', {
  // ── Daemon ────────────────────────────────────────────────────────────────
  daemon: {
    status:  () => ipcRenderer.invoke('daemon:status'),
    start:   () => ipcRenderer.invoke('daemon:start'),
    stop:    () => ipcRenderer.invoke('daemon:stop'),
    restart: () => ipcRenderer.invoke('daemon:restart'),
    logs:    () => ipcRenderer.invoke('daemon:logs')
  },

  // ── Browse & project API ──────────────────────────────────────────────────
  command:   (command: string, args?: string[]) => ipcRenderer.invoke('gstack:command', command, args),
  batch:     (commands: Array<{ command: string; args?: string[] }>) => ipcRenderer.invoke('gstack:batch', commands),
  projects:  () => ipcRenderer.invoke('gstack:projects'),
  learnings: (slug: string) => ipcRenderer.invoke('gstack:learnings', slug),
  skills:        () => ipcRenderer.invoke('gstack:skills'),
  copyCommand:   (skillId: string) => ipcRenderer.invoke('skill:copy-command', skillId),
  readSkillDoc:  (skillId: string) => ipcRenderer.invoke('skill:read-doc', skillId),
  executeSkill:  (skillId: string, hostBin: string) => ipcRenderer.invoke('skill:execute', skillId, hostBin),
  checkGstack:   (path: string) => ipcRenderer.invoke('gstack:check', path),
  installGstack: (targetPath: string) => ipcRenderer.invoke('gstack:install', targetPath),

  // ── Workspace ─────────────────────────────────────────────────────────────
  workspace: {
    browse:  () => ipcRenderer.invoke('workspace:browse'),
    recents: () => ipcRenderer.invoke('workspace:recents'),
    switch:  (path: string) => ipcRenderer.invoke('workspace:switch', path)
  },

  // ── Window controls (Windows / Linux custom titlebar) ─────────────────────
  window: {
    minimize:    () => ipcRenderer.invoke('window:minimize'),
    maximize:    () => ipcRenderer.invoke('window:maximize'),
    close:       () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized')
  },

  // ── Auto-updater ──────────────────────────────────────────────────────────
  updater: {
    check:    () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install:  () => ipcRenderer.invoke('update:install'),
    onAvailable: (cb: (info: { version: string }) => void) => {
      ipcRenderer.on('update:available', (_e, info) => cb(info))
    },
    onReady: (cb: () => void) => {
      ipcRenderer.on('update:ready', () => cb())
    }
  },

  // ── Shell / OS ────────────────────────────────────────────────────────────
  shell: {
    openPath: (p: string) => ipcRenderer.invoke('shell:open-path', p),
    openUrl:  (url: string) => ipcRenderer.invoke('shell:open-url', url)
  },

  // ── App ───────────────────────────────────────────────────────────────────
  appVersion: () => ipcRenderer.invoke('app:version'),

  // ── Host detection ────────────────────────────────────────────────────────
  host: {
    detect: () => ipcRenderer.invoke('host:detect'),
  },


  // ── Config ────────────────────────────────────────────────────────────────
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:set', updates)
  }
})
