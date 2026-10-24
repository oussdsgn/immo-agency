import type { Services } from './contracts'
import { createMockServices } from './mock/mockServices'
import { createBrowserStore } from './mock/storage'

/**
 * Single place where the data source is chosen.
 *
 * Only the mock exists today. To integrate the agency system, implement
 * `Services` with HTTP calls (e.g. `./http/httpServices.ts`) and select it
 * here based on `import.meta.env.VITE_DATA_SOURCE`. Never put API secrets in
 * VITE_* variables — they are bundled into the client.
 */
export const services: Services = createMockServices({ store: createBrowserStore() })

export const IS_MOCK_DATA = true

export type { Services } from './contracts'
export { ServiceError, errorCode } from './errors'
export { onChange } from './events'
