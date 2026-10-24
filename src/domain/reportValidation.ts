import type { LocationInProperty, ReportCategoryId, ResolutionFeedbackInput, Urgency } from '@/types'

export const TITLE_MIN = 5
export const TITLE_MAX = 80
export const DESCRIPTION_MIN = 15
export const DESCRIPTION_MAX = 1000
export const MAX_PHOTOS = 4
export const MAX_PHOTO_INPUT_BYTES = 15 * 1024 * 1024

export interface ReportDraft {
  propertyId: string | null
  categoryId: ReportCategoryId | null
  title: string
  description: string
  location: LocationInProperty | null
  urgency: Urgency
  photos: { id: string; url: string; name: string; sizeBytes: number }[]
}

export const EMPTY_DRAFT: ReportDraft = {
  propertyId: null,
  categoryId: null,
  title: '',
  description: '',
  location: null,
  urgency: 'normal',
  photos: [],
}

/** Values are i18n keys under `validation.*`. */
export type DraftErrors = Partial<Record<'propertyId' | 'categoryId' | 'title' | 'description' | 'location', string>>

export function validatePropertyStep(d: ReportDraft): DraftErrors {
  return d.propertyId ? {} : { propertyId: 'validation.propertyRequired' }
}

export function validateCategoryStep(d: ReportDraft): DraftErrors {
  return d.categoryId ? {} : { categoryId: 'validation.categoryRequired' }
}

export function validateDetailsStep(d: ReportDraft): DraftErrors {
  const errors: DraftErrors = {}
  const title = d.title.trim()
  const description = d.description.trim()
  if (!title) errors.title = 'validation.titleRequired'
  else if (title.length < TITLE_MIN) errors.title = 'validation.titleTooShort'
  else if (title.length > TITLE_MAX) errors.title = 'validation.titleTooLong'
  if (!description) errors.description = 'validation.descriptionRequired'
  else if (description.length < DESCRIPTION_MIN) errors.description = 'validation.descriptionTooShort'
  else if (description.length > DESCRIPTION_MAX) errors.description = 'validation.descriptionTooLong'
  if (!d.location) errors.location = 'validation.locationRequired'
  return errors
}

export function validateDraft(d: ReportDraft): DraftErrors {
  return { ...validatePropertyStep(d), ...validateCategoryStep(d), ...validateDetailsStep(d) }
}

export function hasErrors(e: object): boolean {
  return Object.keys(e).length > 0
}

const PHONE_RE = /^\+?[0-9 ()-]{8,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidPhone(v: string): boolean {
  return PHONE_RE.test(v.trim())
}

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}

export const FEEDBACK_COMMENT_MIN = 5
export const FEEDBACK_COMMENT_MAX = 500

/** Values are i18n keys under `validation.*`. */
export type FeedbackErrors = Partial<Record<'rating' | 'comment', string>>

export function validateFeedback(f: Partial<ResolutionFeedbackInput> & { fixed: boolean }): FeedbackErrors {
  const errors: FeedbackErrors = {}
  const comment = f.comment?.trim() ?? ''
  if (f.fixed) {
    if (!f.rating || f.rating < 1 || f.rating > 5) errors.rating = 'validation.ratingRequired'
  } else if (comment.length < FEEDBACK_COMMENT_MIN) {
    errors.comment = 'validation.stillBrokenRequired'
  }
  if (comment.length > FEEDBACK_COMMENT_MAX) errors.comment = 'validation.commentTooLong'
  return errors
}
