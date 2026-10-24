const KEY = 'immo-agency.onboarding.v1'

/** Whether this device has already seen the intro screens. */
export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === 'done'
  } catch {
    return true // storage blocked: never trap the user in the intro
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, 'done')
  } catch {
    // ignore
  }
}
