import { beforeEach, describe, expect, it } from 'vitest'
import type { NewReportInput } from '@/types'
import type { Services } from '../contracts'
import { ServiceError } from '../errors'
import { createMockServices } from './mockServices'
import { createMemoryStore, type KeyValueStore } from './storage'

const input: NewReportInput = {
  propertyId: 'prop-bahia-a12',
  categoryId: 'plumbing',
  title: 'Robinet qui goutte',
  description: 'Le robinet de la cuisine goutte en permanence.',
  location: 'kitchen',
  urgency: 'low',
  attachments: [],
}

describe('mock services', () => {
  let store: KeyValueStore
  let s: Services

  beforeEach(async () => {
    store = createMemoryStore()
    s = createMockServices({ store, latency: [0, 0] })
    await s.auth.signInDemo()
  })

  it('rejects data access without a session', async () => {
    await s.auth.signOut()
    await expect(s.reports.listReports()).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('creates a report with a unique dev reference, initial status and notification', async () => {
    const a = await s.reports.createReport(input)
    const b = await s.reports.createReport(input)
    expect(a.reference).toMatch(/^DEV-\d{4}-\d{4}$/)
    expect(a.reference).not.toBe(b.reference)
    expect(a.status).toBe('submitted')
    expect(a.history).toHaveLength(1)
    const notes = await s.notifications.listNotifications()
    expect(notes.filter((n) => n.type === 'report_submitted' && n.reportId === a.id)).toHaveLength(1)
  })

  it('persists across service instances (page refresh)', async () => {
    const created = await s.reports.createReport(input)
    const again = createMockServices({ store, latency: [0, 0] })
    await expect(again.reports.getReport(created.id)).resolves.toMatchObject({ title: input.title })
  })

  it('refuses reports for properties the resident does not own', async () => {
    await expect(s.reports.createReport({ ...input, propertyId: 'someone-else' })).rejects.toBeInstanceOf(ServiceError)
    await expect(s.properties.getProperty('someone-else')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('simulated failure fails the next write once, without saving it', async () => {
    const before = (await s.reports.listReports()).length
    s.dev!.setFailureMode('next-write')
    await expect(s.reports.createReport(input)).rejects.toMatchObject({ code: 'network' })
    expect((await s.reports.listReports()).length).toBe(before)
    await expect(s.reports.createReport(input)).resolves.toBeTruthy()
  })

  it('simulates agency transitions, marking them as simulated', async () => {
    const r = await s.reports.createReport(input)
    const updated = await s.dev!.simulateAgencyStatus(r.id, 'under_review')
    expect(updated.status).toBe('under_review')
    expect(updated.history.at(-1)).toMatchObject({ status: 'under_review', simulated: true, source: 'agency' })
    await expect(s.dev!.simulateAgencyStatus(r.id, 'closed')).rejects.toMatchObject({ code: 'validation' })
  })

  it('lets residents reply only while a report is open', async () => {
    const r = await s.reports.createReport(input)
    const replied = await s.reports.addResidentMessage(r.id, 'Voici une précision', [])
    expect(replied.messages.at(-1)).toMatchObject({ author: 'resident', body: 'Voici une précision' })
    // seed report rep-0119 is closed
    await expect(s.reports.addResidentMessage('rep-0119', 'x', [])).rejects.toMatchObject({ code: 'validation' })
  })

  it('reports storage quota errors and rolls back', async () => {
    const before = (await s.reports.listReports()).length
    const failing: KeyValueStore = {
      ...store,
      set: (k, v) => {
        if (k.includes('.db.')) throw new Error('QuotaExceededError')
        store.set(k, v)
      },
      get: store.get,
      remove: store.remove,
    }
    const s2 = createMockServices({ store: failing, latency: [0, 0] })
    await expect(s2.reports.createReport(input)).rejects.toMatchObject({ code: 'storage_full' })
    expect((await s2.reports.listReports()).length).toBe(before)
  })

  it('empty dataset has no properties, reports or notifications', async () => {
    await s.dev!.resetData('empty')
    expect(await s.properties.listMyProperties()).toEqual([])
    expect(await s.reports.listReports()).toEqual([])
    expect(await s.notifications.listNotifications()).toEqual([])
  })

  it('records a rating when the resident confirms the fix', async () => {
    // seed report rep-0128 is resolved and awaiting confirmation
    const r = await s.reports.submitFeedback('rep-0128', { fixed: true, rating: 4, comment: 'Rapide' })
    expect(r.status).toBe('resolved')
    expect(r.feedback).toMatchObject({ fixed: true, rating: 4, comment: 'Rapide' })
    await expect(s.reports.submitFeedback('rep-0128', { fixed: true, rating: 5 })).rejects.toMatchObject({ code: 'validation' })
  })

  it('reopens the report when the problem persists, and asks again after a new resolution', async () => {
    const r = await s.reports.submitFeedback('rep-0128', { fixed: false, comment: 'Toujours bloqué au 3e' })
    expect(r.status).toBe('in_progress')
    expect(r.feedback).toBeUndefined()
    expect(r.history.at(-1)).toMatchObject({ status: 'in_progress', source: 'resident' })
    expect(r.messages.at(-1)).toMatchObject({ author: 'resident', body: 'Toujours bloqué au 3e' })
    const again = await s.dev!.simulateAgencyStatus(r.id, 'resolved')
    expect(again.status).toBe('resolved')
    expect(again.feedback).toBeUndefined()
  })

  it('rejects invalid feedback', async () => {
    await expect(s.reports.submitFeedback('rep-0128', { fixed: true })).rejects.toMatchObject({ code: 'validation' })
    await expect(s.reports.submitFeedback('rep-0147', { fixed: true, rating: 3 })).rejects.toMatchObject({ code: 'validation' })
  })
})
