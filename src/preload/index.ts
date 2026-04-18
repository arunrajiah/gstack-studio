import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gstack', {
  daemon: {
    status:  () => ipcRenderer.invoke('daemon:status'),
    start:   () => ipcRenderer.invoke('daemon:start'),
    stop:    () => ipcRenderer.invoke('daemon:stop'),
    restart: () => ipcRenderer.invoke('daemon:restart'),
    logs:    () => ipcRenderer.invoke('daemon:logs')
  },
  command:   (command: string, args?: string[]) => ipcRenderer.invoke('gstack:command', command, args),
  batch:     (commands: Array<{ command: string; args?: string[] }>) => ipcRenderer.invoke('gstack:batch', commands),
  projects:  () => ipcRenderer.invoke('gstack:projects'),
  learnings: (slug: string) => ipcRenderer.invoke('gstack:learnings', slug),
  skills:    () => ipcRenderer.invoke('gstack:skills'),
  copyCommand: (skillId: string) => ipcRenderer.invoke('skill:copy-command', skillId),
  workspace: {
    browse:  () => ipcRenderer.invoke('workspace:browse'),
    recents: () => ipcRenderer.invoke('workspace:recents'),
    switch:  (path: string) => ipcRenderer.invoke('workspace:switch', path)
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:set', updates)
  }
})
