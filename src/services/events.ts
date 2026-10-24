/**
 * Tiny change bus. Services emit a topic after a mutation; data hooks
 * subscribed to that topic refetch. A real backend could feed the same bus
 * from push notifications, server-sent events or websockets.
 */
export type DataTopic = 'reports' | 'notifications' | 'preferences' | 'session' | 'all'

type Listener = (topic: DataTopic) => void

const listeners = new Set<Listener>()

export function emitChange(topic: DataTopic): void {
  listeners.forEach((l) => l(topic))
}

export function onChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
