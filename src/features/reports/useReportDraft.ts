import { useCallback, useEffect, useState } from 'react'
import { EMPTY_DRAFT, type ReportDraft } from '@/domain/reportValidation'

const KEY = 'immo-agency.reportDraft.v1'

interface Stored {
  draft: ReportDraft
  step: number
}

function read(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

/**
 * Keeps the unsent report in sessionStorage so a refresh (or a language
 * switch) never loses it. Cleared after a successful submission or cancel.
 */
export function useReportDraft() {
  const [initial] = useState(read)
  const [draft, setDraft] = useState<ReportDraft>(initial?.draft ?? EMPTY_DRAFT)
  const [step, setStep] = useState(initial?.step ?? 0)
  const [dirty, setDirty] = useState(Boolean(initial))

  useEffect(() => {
    if (!dirty) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ draft, step } satisfies Stored))
    } catch {
      // Quota exceeded (large photos): keep the text fields at least.
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ draft: { ...draft, photos: [] }, step }))
      } catch {
        // ignore
      }
    }
  }, [draft, step, dirty])

  const update = useCallback((patch: Partial<ReportDraft>) => {
    setDirty(true)
    setDraft((d) => ({ ...d, ...patch }))
  }, [])

  /** Sets defaults without marking the draft as edited by the resident. */
  const prefill = useCallback((patch: Partial<ReportDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
  }, [])

  const clear = useCallback(() => {
    setDirty(false)
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  }, [])

  return { draft, update, prefill, step, setStep, clear, restored: Boolean(initial), dirty }
}
