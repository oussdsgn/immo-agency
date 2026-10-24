import { describe, expect, it } from 'vitest'
import { EMPTY_DRAFT, hasErrors, isValidEmail, isValidPhone, validateDetailsStep, validateDraft } from './reportValidation'
import { AGENCY_TRANSITIONS, canResidentReply, matchesStatusFilter } from './reportWorkflow'

describe('report validation', () => {
  it('flags every required field on an empty draft', () => {
    expect(validateDraft(EMPTY_DRAFT)).toEqual({
      propertyId: 'validation.propertyRequired',
      categoryId: 'validation.categoryRequired',
      title: 'validation.titleRequired',
      description: 'validation.descriptionRequired',
      location: 'validation.locationRequired',
    })
  })

  it('checks lengths after trimming', () => {
    const e = validateDetailsStep({ ...EMPTY_DRAFT, title: '  ab  ', description: 'court', location: 'kitchen' })
    expect(e.title).toBe('validation.titleTooShort')
    expect(e.description).toBe('validation.descriptionTooShort')
    expect(e.location).toBeUndefined()
  })

  it('accepts a complete draft', () => {
    const ok = validateDraft({
      ...EMPTY_DRAFT,
      propertyId: 'p',
      categoryId: 'plumbing',
      title: 'Fuite sous évier',
      description: 'Une fuite apparaît sous l’évier depuis ce matin.',
      location: 'kitchen',
    })
    expect(hasErrors(ok)).toBe(false)
  })

  it('validates contact fields', () => {
    expect(isValidPhone('+213 5 00 00 00 00')).toBe(true)
    expect(isValidPhone('abc')).toBe(false)
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
  })
})

describe('report workflow', () => {
  it('only open reports accept resident replies', () => {
    expect(canResidentReply({ status: 'awaiting_resident' })).toBe(true)
    expect(canResidentReply({ status: 'closed' })).toBe(false)
  })

  it('terminal states have no agency transitions', () => {
    expect(AGENCY_TRANSITIONS.closed).toEqual([])
    expect(AGENCY_TRANSITIONS.rejected).toEqual([])
  })

  it('maps statuses to filters', () => {
    expect(matchesStatusFilter('in_progress', 'open')).toBe(true)
    expect(matchesStatusFilter('resolved', 'open')).toBe(false)
    expect(matchesStatusFilter('resolved', 'done')).toBe(true)
    expect(matchesStatusFilter('awaiting_resident', 'awaiting_resident')).toBe(true)
  })
})
