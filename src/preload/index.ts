import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gstack', {
  daemon: {
    status: () => ipcRenderer.invoke('daemon:status'),
    start:  () => ipcRenderer.invoke('daemon:start'),
    stop:   () => ipcRenderer.invoke('daemon:stop')
  },
  command:   (command: string, args?: string[]) => ipcRenderer.invoke('gstack:command', command, args),
  batch:     (commands: Array<{ command: string; args?: string[] }>) => ipcRenderer.invoke('gstack:batch', commands),
  projects:  () => ipcRenderer.invoke('gstack:projects'),
  learnings: (slug: string) => ipcRenderer.invoke('gstack:learnings', slug),
  skills:    () => ipcRenderer.invoke('gstack:skills'),
  copyCommand: (skillId: string) => ipcRenderer.invoke('skill:copy-command', skillId),
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (updates: Record<string, string>) => ipcRenderer.invoke('config:set', updates)
  }
})
