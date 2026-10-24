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
 * Validates and downsizes a photo to a JPEG data URL (max 1280px) so it fits
 * in development storage. In production, upload the original file to the
 * agency's storage via a pre-signed URL instead.
 */
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
  const url = canvas.toDataURL('image/jpeg', quality)
  return { id: uid('att'), url, name: file.name, sizeBytes: Math.round((url.length * 3) / 4) }
}

export class PhotoPrepError extends Error {
  readonly key: PhotoError
  constructor(key: PhotoError) {
    super(key)
    this.key = key
  }
}
