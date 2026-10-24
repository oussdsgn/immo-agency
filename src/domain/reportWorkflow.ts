import type { Report, ReportStatus } from '@/types'

/**
 * Resident-facing status model. The agency's internal workflow can have more
 * states; map them onto these when integrating the real API.
 */
export const REPORT_STATUSES: ReportStatus[] = [
  'submitted',
  'under_review',
  'in_progress',
  'awaiting_resident',
  'resolved',
  'closed',
  'rejected',
]

export type StatusTone = 'neutral' | 'info' | 'progress' | 'attention' | 'success' | 'muted' | 'danger'

export const STATUS_TONE: Record<ReportStatus, StatusTone> = {
  submitted: 'neutral',
  under_review: 'info',
  in_progress: 'progress',
  awaiting_resident: 'attention',
  resolved: 'success',
  closed: 'muted',
  rejected: 'danger',
}

const OPEN: ReportStatus[] = ['submitted', 'under_review', 'in_progress', 'awaiting_resident']

export function isOpen(status: ReportStatus): boolean {
  return OPEN.includes(status)
}

/** A resolved report waits for the resident to confirm the fix (or reopen it). */
export function needsFeedback(report: Pick<Report, 'status' | 'feedback'>): boolean {
  return report.status === 'resolved' && !report.feedback
}

/** Resident can add messages/photos while the report is still being handled. */
export function canResidentReply(report: Pick<Report, 'status'>): boolean {
  return isOpen(report.status)
}

/**
 * Agency-side transitions. Used only by the development simulator — residents
 * never change statuses themselves.
 */
export const AGENCY_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['in_progress', 'awaiting_resident', 'rejected'],
  in_progress: ['resolved', 'awaiting_resident'],
  awaiting_resident: ['in_progress', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  rejected: [],
}

export type StatusFilter = 'all' | 'open' | 'awaiting_resident' | 'done'

export function matchesStatusFilter(status: ReportStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'open':
      return isOpen(status)
    case 'awaiting_resident':
      return status === 'awaiting_resident'
    case 'done':
      return !isOpen(status)
  }
}
