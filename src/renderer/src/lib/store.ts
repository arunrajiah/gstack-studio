import { useState, useEffect, useCallback } from 'react'
import { client, DaemonState, Skill, AppConfig } from './gstack-client'

export function useDaemon() {
  const [state, setState] = useState<DaemonState>({
    running: false, port: null, token: null, pid: null,
    gstackPath: null, workspacePath: null
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const s = await client.daemon.status()
      setState(s)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  const start = useCallback(async () => {
    setLoading(true)
    try {
      const s = await client.daemon.start()
      setState(s)
    } catch (err) {
      console.error('[daemon start]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 8_000)
    return () => clearInterval(interval)
  }, [refresh])

  return { state, loading, refresh, start }
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
    anthropicApiKey: '', gstackPath: '', workspacePath: '', openaiApiKey: ''
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
