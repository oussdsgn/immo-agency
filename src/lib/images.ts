import { MAX_PHOTO_INPUT_BYTES } from '@/domain/reportValidation'
import { uid } from './id'

export interface PreparedPhoto {
  id: string
  url: string
  name: string
  sizeBytes: number
}

export type PhotoError = 'validation.photoInvalid' | 'validation.photoTooLarge'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
export const PHOTO_ACCEPT = ACCEPTED.join(',')

/**
 * Validates and downsizes a photo to a JPEG data URL (max 1280px). The data
 * URL is what gets stored (localStorage in demo mode, a Firestore document
 * when connected), so it is kept under MAX_DATA_URL_CHARS.
 */
/** Below the 900 000 characters accepted by firebase/firestore.rules. */
const MAX_DATA_URL_CHARS = 850_000

export async function preparePhoto(file: File, maxSide = 1280, quality = 0.72): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/')) throw new PhotoPrepError('validation.photoInvalid')
  if (file.size > MAX_PHOTO_INPUT_BYTES) throw new PhotoPrepError('validation.photoTooLarge')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new PhotoPrepError('validation.photoInvalid')
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoPrepError('validation.photoInvalid')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  let url = canvas.toDataURL('image/jpeg', quality)
  // Very detailed photos: lower the quality until it fits a Firestore document.
  for (let q = quality - 0.15; url.length > MAX_DATA_URL_CHARS && q > 0.2; q -= 0.15) url = canvas.toDataURL('image/jpeg', q)
  if (url.length > MAX_DATA_URL_CHARS) throw new PhotoPrepError('validation.photoTooLarge')
  return { id: uid('att'), url, name: file.name, sizeBytes: Math.round((url.length * 3) / 4) }
}

export class PhotoPrepError extends Error {
  readonly key: PhotoError
  constructor(key: PhotoError) {
    super(key)
    this.key = key
  }
}
