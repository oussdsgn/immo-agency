import { CircleCheck, RotateCcw, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FieldError, TextArea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FEEDBACK_COMMENT_MAX, hasErrors, validateFeedback, type FeedbackErrors } from '@/domain/reportValidation'
import { needsFeedback } from '@/domain/reportWorkflow'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { errorCode, services } from '@/services'
import type { Rating, Report } from '@/types'

const RATINGS: Rating[] = [1, 2, 3, 4, 5]

/** Asks the resident to confirm a resolved report, or shows their earlier answer. */
export function ResolutionFeedback({ report }: { report: Report }) {
  if (report.feedback?.fixed) return <FeedbackSummary report={report} />
  if (!needsFeedback(report)) return null
  return <FeedbackForm reportId={report.id} />
}

function FeedbackForm({ reportId }: { reportId: string }) {
  const { t } = useI18n()
  const toast = useToast()
  const [fixed, setFixed] = useState<boolean | null>(null)
  const [rating, setRating] = useState<Rating | undefined>()
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<FeedbackErrors>({})
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const inFlight = useRef(false)

  async function submit() {
    if (inFlight.current || fixed === null) return
    const input = { fixed, rating: fixed ? rating : undefined, comment }
    const e = validateFeedback(input)
    setErrors(e)
    if (hasErrors(e)) return
    inFlight.current = true
    setSending(true)
    setSubmitError(null)
    try {
      await services.reports.submitFeedback(reportId, input)
      toast(fixed ? t('feedback.sent') : t('feedback.reopened'))
    } catch (err) {
      // Keep the answer so the resident can retry.
      setSubmitError(t(`errors.${errorCode(err)}`))
      inFlight.current = false
      setSending(false)
    }
  }

  return (
    <section
      aria-labelledby="feedback-title"
      className="rounded-card border border-success-ink/25 bg-success-soft/60 p-4 sm:p-5"
    >
      <h2 id="feedback-title" className="text-base font-bold text-ink">
        {t('feedback.question')}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{t('feedback.hint')}</p>

      {fixed === null ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <Button variant="secondary" size="lg" onClick={() => setFixed(true)} icon={<ThumbsUp className="size-4.5" aria-hidden />}>
            {t('feedback.yes')}
          </Button>
          <Button variant="ghost" size="lg" className="border border-line-strong bg-surface" onClick={() => setFixed(false)} icon={<ThumbsDown className="size-4.5" aria-hidden />}>
            {t('feedback.no')}
          </Button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {fixed && (
            <StarRating
              value={rating}
              onChange={(r) => {
                setRating(r)
                setErrors(({ rating: _cleared, ...rest }) => (void _cleared, rest))
              }}
              error={errors.rating && t(errors.rating as TKey)}
            />
          )}
          <TextArea
            label={fixed ? t('feedback.commentLabel') : t('feedback.stillBrokenLabel')}
            optionalLabel={fixed ? t('common.optional') : undefined}
            placeholder={fixed ? t('feedback.commentPlaceholder') : t('feedback.stillBrokenPlaceholder')}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value)
              if (errors.comment) setErrors(validateFeedback({ fixed: Boolean(fixed), rating, comment: e.target.value }))
            }}
            maxLength={FEEDBACK_COMMENT_MAX}
            rows={3}
            className="min-h-24"
            error={errors.comment && t(errors.comment as TKey)}
            autoFocus={!fixed}
          />
          {submitError && <FieldError>{submitError}</FieldError>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setFixed(null)
                setErrors({})
              }}
              disabled={sending}
            >
              {t('feedback.changeAnswer')}
            </Button>
            <Button
              type="submit"
              loading={sending}
              variant={fixed ? 'primary' : 'danger'}
              className={fixed ? undefined : 'border border-danger-ink/30'}
              icon={!sending && (fixed ? <CircleCheck className="size-4.5" aria-hidden /> : <RotateCcw className="size-4.5" aria-hidden />)}
            >
              {fixed ? t('feedback.submitFixed') : t('feedback.submitReopen')}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

function StarRating({ value, onChange, error }: { value?: Rating; onChange: (r: Rating) => void; error?: string }) {
  const { t } = useI18n()
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{t('feedback.ratingLabel')}</legend>
      <div className="flex items-center gap-1" dir="ltr">
        {RATINGS.map((r) => {
          const on = value !== undefined && r <= value
          return (
            <label
              key={r}
              className="grid size-11 place-items-center rounded-full transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand hover:bg-surface"
              title={t(`feedback.ratings.r${r}`)}
            >
              <input
                type="radio"
                name={name}
                value={r}
                checked={value === r}
                onChange={() => onChange(r)}
                className="sr-only"
                aria-label={`${t('feedback.ratingValue', { value: r })} — ${t(`feedback.ratings.r${r}`)}`}
                aria-invalid={Boolean(error) || undefined}
              />
              <Star
                className={cn('size-7 transition-[color,transform]', on ? 'fill-brand text-brand' : 'text-line-strong', value === r && 'scale-110')}
                strokeWidth={1.8}
                aria-hidden
              />
            </label>
          )
        })}
        {value && <span className="ms-2 text-sm font-semibold text-ink-soft">{t(`feedback.ratings.r${value}`)}</span>}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </fieldset>
  )
}

function FeedbackSummary({ report }: { report: Report }) {
  const { t, f } = useI18n()
  const fb = report.feedback!
  return (
    <section aria-labelledby="feedback-summary" className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-ink" aria-hidden />
      <div className="min-w-0">
        <h2 id="feedback-summary" className="text-sm font-bold text-ink">
          {t('feedback.thanksTitle')}
        </h2>
        {fb.rating && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="sr-only">{t('feedback.yourRating')} :</span>
            <span className="flex" dir="ltr" aria-hidden>
              {RATINGS.map((r) => (
                <Star key={r} className={cn('size-4', r <= fb.rating! ? 'fill-brand text-brand' : 'text-line-strong')} />
              ))}
            </span>
            <span>
              {t('feedback.ratingValue', { value: fb.rating })} — {t(`feedback.ratings.r${fb.rating}`)}
            </span>
          </p>
        )}
        {fb.comment && (
          <p dir="auto" className="mt-1.5 text-start text-sm text-ink-soft">
            “{fb.comment}”
          </p>
        )}
        <p className="mt-1 text-xs text-muted">{f.dateTime(fb.at)}</p>
      </div>
    </section>
  )
}
