import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DependencyList } from 'react'
import { onChange } from '@/services'
import type { DataTopic } from '@/services/events'

export interface AsyncState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => void
}

interface Settled<T> {
  key: string
  data: T | undefined
  error: unknown
}

/**
 * Minimal data-fetching hook. Refetches when `deps` change or when a service
 * emits one of `topics`. Background refetches keep the previous data visible.
 * Could be swapped for TanStack Query once a real API exists.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList, topics: DataTopic[] = []): AsyncState<T> {
  const [tick, setTick] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({ key: '', data: undefined, error: null })
  const loaderRef = useRef(loader)
  useLayoutEffect(() => {
    loaderRef.current = loader
  })

  const key = `${JSON.stringify(deps)}#${tick}`
  const topicsKey = topics.join(',')

  useEffect(() => {
    let cancelled = false
    loaderRef.current().then(
      (data) => !cancelled && setSettled({ key, data, error: null }),
      (error: unknown) => !cancelled && setSettled((s) => ({ key, data: s.data, error })),
    )
    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    if (!topicsKey) return
    const wanted = topicsKey.split(',')
    return onChange((topic) => {
      if (topic === 'all' || wanted.includes(topic)) setTick((n) => n + 1)
    })
  }, [topicsKey])

  const reload = useCallback(() => setTick((n) => n + 1), [])
  const loading = settled.key !== key
  return { data: settled.data, error: loading ? null : settled.error, loading, reload }
}
