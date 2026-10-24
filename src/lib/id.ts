/** Random id that also works outside secure contexts (crypto.randomUUID needs HTTPS/localhost). */
export function uid(prefix = ''): string {
  const c = globalThis.crypto
  const core =
    typeof c?.randomUUID === 'function'
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}-${core}` : core
}
