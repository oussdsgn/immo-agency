import { ArrowLeft, ArrowRight, Building2, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AsyncBoundary, EmptyState, Skeleton } from '@/components/ui/States'
import {
  hasErrors,
  validateCategoryStep,
  validateDetailsStep,
  validateDraft,
  validatePropertyStep,
  type DraftErrors,
  type ReportDraft,
} from '@/domain/reportValidation'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { errorCode, services } from '@/services'
import type { Property, ReportCategory } from '@/types'
import { useReportDraft } from '../useReportDraft'
import { Stepper } from './Stepper'
import { InlineAlert, StepCategory, StepDetails, StepProperty, StepReview } from './Steps'

type StepId = 'property' | 'category' | 'details' | 'review'

const VALIDATORS: Record<Exclude<StepId, 'review'>, (d: ReportDraft) => DraftErrors> = {
  property: validatePropertyStep,
  category: validateCategoryStep,
  details: validateDetailsStep,
}

export function NewReportPage() {
  const state = useAsync(
    () => Promise.all([services.properties.listMyProperties(), services.reports.listCategories()]),
    [],
  )
  return (
    <AsyncBoundary state={state} skeleton={<Skeleton className="h-96 rounded-card" />}>
      {([properties, categories]) => <ReportWizard properties={properties} categories={categories} />}
    </AsyncBoundary>
  )
}

function ReportWizard({ properties, categories }: { properties: Property[]; categories: ReportCategory[] }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { draft, update, prefill, step, setStep, clear, dirty } = useReportDraft()
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const inFlight = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Skip the property step when there is nothing to choose.
  const steps = useMemo<StepId[]>(
    () => (properties.length > 1 ? ['property', 'category', 'details', 'review'] : ['category', 'details', 'review']),
    [properties.length],
  )
  const current = steps[Math.min(step, steps.length - 1)]

  // Preselect the property (single property, or coming from a property page).
  useEffect(() => {
    const fromParam = params.get('bien')
    const valid = (id: string | null) => !!id && properties.some((p) => p.id === id)
    if (valid(fromParam) && draft.propertyId !== fromParam) {
      prefill({ propertyId: fromParam })
      if (step === 0 && steps[0] === 'property') setStep(1)
    } else if (properties.length === 1 && draft.propertyId !== properties[0].id) {
      prefill({ propertyId: properties[0].id })
    }
    const fromCategory = params.get('categorie')
    if (!draft.categoryId && categories.some((c) => c.id === fromCategory)) {
      prefill({ categoryId: fromCategory as ReportCategory['id'] })
    }
    // Only on mount: later changes are the resident's own choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exitTo = params.get('bien') ? `/biens/${params.get('bien')}` : '/'

  if (properties.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Building2 />}
          title={t('newReport.noPropertyTitle')}
          body={t('newReport.noPropertyBody')}
          action={<ButtonLink to="/" variant="secondary">{t('confirmation.backHome')}</ButtonLink>}
        />
      </Card>
    )
  }

  function goTo(index: number) {
    setErrors({})
    setStep(index)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      panelRef.current?.focus({ preventScroll: true })
    })
  }

  function next() {
    if (current === 'review') return
    const e = VALIDATORS[current](draft)
    if (hasErrors(e)) {
      setErrors(e)
      requestAnimationFrame(() => {
        const el = panelRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
        el?.focus()
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
      return
    }
    goTo(step + 1)
  }

  function back() {
    if (step === 0) leave()
    else goTo(step - 1)
  }

  function leave() {
    if (dirty) setConfirmLeave(true)
    else navigate(exitTo)
  }

  async function submit() {
    // Guard against double clicks before React re-renders the disabled button.
    if (inFlight.current) return
    const e = validateDraft(draft)
    if (hasErrors(e)) {
      const firstBad = steps.findIndex((s) => s !== 'review' && hasErrors(VALIDATORS[s](draft)))
      goTo(Math.max(0, firstBad))
      setErrors(e)
      return
    }
    inFlight.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      const report = await services.reports.createReport({
        propertyId: draft.propertyId!,
        categoryId: draft.categoryId!,
        title: draft.title,
        description: draft.description,
        location: draft.location!,
        urgency: draft.urgency,
        attachments: draft.photos,
      })
      clear()
      navigate(`/signaler/confirmation/${report.id}`, { replace: true })
    } catch (err) {
      const code = errorCode(err)
      setSubmitError(code === 'storage_full' ? t('errors.storage_full') : t('newReport.submitFailed'))
      inFlight.current = false
      setSubmitting(false)
    }
  }

  // Once errors are shown, re-validate as the resident edits so fixed fields clear immediately.
  function edit(patch: Partial<ReportDraft>) {
    update(patch)
    if (hasErrors(errors) && current !== 'review') setErrors(VALIDATORS[current]({ ...draft, ...patch }))
  }

  const labels = steps.map((s) => t(`newReport.steps.${s}`))
  const property = properties.find((p) => p.id === draft.propertyId)

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          className="-ms-2 grid size-10 place-items-center rounded-full text-ink-soft hover:bg-sunken"
          aria-label={step === 0 ? t('common.back') : t('common.previous')}
        >
          <ArrowLeft className="size-5 flip-rtl" aria-hidden />
        </button>
        <h1 className="flex-1 text-lg font-bold text-ink sm:text-xl">{t('newReport.title')}</h1>
        <button
          type="button"
          onClick={leave}
          className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-sunken"
          aria-label={t('common.cancel')}
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <Stepper labels={labels} current={step} />

      <div ref={panelRef} tabIndex={-1} key={current} className="animate-fade-up outline-none">
        {current === 'property' && <StepProperty draft={draft} update={edit} errors={errors} properties={properties} />}
        {current === 'category' && <StepCategory draft={draft} update={edit} errors={errors} categories={categories} />}
        {current === 'details' && <StepDetails draft={draft} update={edit} errors={errors} />}
        {current === 'review' && (
          <div className="space-y-4">
            <StepReview
              draft={draft}
              property={property}
              editTargets={steps.filter((s): s is Exclude<StepId, 'review'> => s !== 'review')}
              onEdit={(target) => goTo(steps.indexOf(target))}
            />
            <InlineAlert tone="info">{t('newReport.prototypeNotice')}</InlineAlert>
            {submitError && (
              <InlineAlert
                tone="error"
                action={
                  <Button size="sm" variant="danger" onClick={submit} className="border border-danger-ink/30">
                    {t('common.retry')}
                  </Button>
                }
              >
                {submitError}
              </InlineAlert>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-t-card sm:border-x">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="ghost" size="lg" onClick={back} className="border border-line" icon={<ArrowLeft className="size-4.5 flip-rtl" aria-hidden />}>
              <span className="max-sm:sr-only">{t('common.previous')}</span>
            </Button>
          )}
          {current === 'review' ? (
            <Button size="lg" block onClick={submit} loading={submitting} icon={!submitting && <Send className="size-4.5 flip-rtl" aria-hidden />}>
              {submitting ? t('newReport.submitting') : t('newReport.submit')}
            </Button>
          ) : (
            <Button size="lg" block onClick={next} iconEnd={<ArrowRight className="size-4.5 flip-rtl" aria-hidden />}>
              {t('common.next')}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        message={t('newReport.cancelConfirm')}
        confirmLabel={t('newReport.discard')}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => {
          clear()
          setConfirmLeave(false)
          navigate(exitTo)
        }}
      />
    </div>
  )
}
