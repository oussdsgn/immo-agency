/**
 * Key/value persistence for DEVELOPMENT DATA ONLY.
 *
 * Browser localStorage is readable by any script on the origin and is not a
 * secure place for credentials or personal data. It is used here only so the
 * prototype survives page refreshes.
 */
export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  }
}

export function createBrowserStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage
    const probe = '__immo_agency_probe__'
    ls.setItem(probe, '1')
    ls.removeItem(probe)
    return {
      get: (k) => ls.getItem(k),
      // setItem may throw QuotaExceededError; callers translate it.
      set: (k, v) => ls.setItem(k, v),
      remove: (k) => ls.removeItem(k),
    }
  } catch {
    // Private mode / blocked storage: fall back to memory for this tab.
    return createMemoryStore()
  }
}
