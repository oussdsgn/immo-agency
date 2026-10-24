export type ServiceErrorCode = 'network' | 'not_found' | 'unauthorized' | 'validation' | 'storage_full' | 'unknown'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode

  constructor(code: ServiceErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ServiceError'
    this.code = code
  }
}

export function errorCode(err: unknown): ServiceErrorCode {
  return err instanceof ServiceError ? err.code : 'unknown'
}
