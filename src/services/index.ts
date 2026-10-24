import type { Services } from './contracts'
import { createFirebaseServices } from './firebase/firebaseServices'
import { createMockServices } from './mock/mockServices'
import { createBrowserStore } from './mock/storage'

/**
 * Single place where the data source is chosen (VITE_DATA_SOURCE at build time):
 *
 * - `firebase` (default for production builds): the agency's Firebase project
 *   — real accounts, shared data, live updates with the agency dashboard.
 * - `mock` (default for `npm run dev`): local demo data, no account needed.
 *
 * The Firebase web config is public by design; access is enforced by
 * firebase/firestore.rules. Never put a service-account key in a VITE_* variable.
 */
const source = import.meta.env.VITE_DATA_SOURCE ?? (import.meta.env.DEV ? 'mock' : 'firebase')

export const IS_MOCK_DATA = source !== 'firebase'

export const services: Services = IS_MOCK_DATA ? createMockServices({ store: createBrowserStore() }) : createFirebaseServices()

export type { Services } from './contracts'
export { ServiceError, errorCode } from './errors'
export { onChange } from './events'
