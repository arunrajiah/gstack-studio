import { useState, useEffect, useCallback } from 'react'
import { client, DaemonState, Skill, AppConfig } from './gstack-client'
import { toast } from './toast'

export function useDaemon() {
  const [state, setState] = useState<DaemonState>({
    running: false, port: null, token: null, pid: null,
    gstackPath: null, workspacePath: null
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setState(await client.daemon.status()) }
    catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const start = useCallback(async () => {
    setLoading(true)
    try {
      const s = await client.daemon.start()
      setState(s)
      toast.success(s.running ? `Daemon started on port ${s.port}` : 'Daemon started')
    } catch (err) {
      console.error('[daemon start]', err)
      toast.error(`Failed to start daemon: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [])

  const stop = useCallback(async () => {
    setLoading(true)
    try {
      setState(await client.daemon.stop())
      toast.info('Daemon stopped')
    } catch (err) {
      console.error('[daemon stop]', err)
      toast.error(`Stop failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [])

  const restart = useCallback(async () => {
    setLoading(true)
    try {
      const s = await client.daemon.restart()
      setState(s)
      toast.success(s.running ? `Daemon restarted on port ${s.port}` : 'Daemon restarted')
    } catch (err) {
      console.error('[daemon restart]', err)
      toast.error(`Restart failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 8_000)
    return () => clearInterval(interval)
  }, [refresh])

  return { state, loading, refresh, start, stop, restart }
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.skills()
      .then(s => { setSkills(s); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { skills, loading, error }
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>({
    anthropicApiKey: '', gstackPath: '', workspacePath: '', openaiApiKey: '',
    recentWorkspaces: [], autoStartDaemon: false, theme: 'dark'
  })

  useEffect(() => {
    client.config.get().then(setConfig).catch(console.error)
  }, [])

  const save = useCallback(async (updates: Partial<AppConfig>) => {
    const updated = await client.config.set(updates)
    setConfig(updated)
  }, [])

  return { config, save }
}

/** Polls daemon logs every 2 s. Returns a copy of the log ring buffer. */
export function useDaemonLogs(enabled = true) {
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    if (!enabled) return
    const fetch = () => client.daemon.logs().then(setLogs).catch(() => {/* ignore */})
    fetch()
    const id = setInterval(fetch, 2_000)
    return () => clearInterval(id)
  }, [enabled])

  return logs
}

/** One-shot fetch of recent workspace paths. */
export function useRecentWorkspaces() {
  const [recents, setRecents] = useState<string[]>([])
  const reload = useCallback(() => {
    client.workspace.recents().then(setRecents).catch(console.error)
  }, [])

  useEffect(() => { reload() }, [reload])

  const switchTo = useCallback(async (path: string) => {
    const res = await client.workspace.switch(path)
    setRecents(res.recentWorkspaces)
    return res
  }, [])

  return { recents, switchTo, reload }
}
