import { BedDouble, CircleCheck, DoorOpen, MapPin, Ruler } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextArea, TextField } from '@/components/ui/Field'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, Skeleton } from '@/components/ui/States'
import { isValidEmail, isValidPhone } from '@/domain/reportValidation'
import { InlineAlert } from '@/features/reports/new/Steps'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import { errorCode, services } from '@/services'
import type { Listing } from '@/types'
import { usePriceLabel } from './usePriceLabel'

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const { t, tp, locale } = useI18n()
  const priceLabel = usePriceLabel()
  const state = useAsync(() => services.listings.getListing(id), [id])

  return (
    <>
      <PageHeader title={t('acquire.title')} back="/acquerir" />
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-96 rounded-card" />}>
        {(l) => (
          <div className="animate-fade-up space-y-6">
            <Card className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-sunken sm:aspect-[16/7]">
                <BuildingIllustration visual={l.visual} label={l.title[locale]} />
                <Badge tone="dev" className="absolute end-3 top-3">
                  {t('common.fictionalData')}
                </Badge>
              </div>
              <div className="p-4 sm:p-5">
                <Badge tone="brand">{t(`acquire.filters.${l.transaction}`)}</Badge>
                <h2 className="mt-2 text-xl leading-snug font-bold tracking-tight text-ink">{l.title[locale]}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {[l.district, l.city].filter(Boolean).join(', ')}
                </p>
                <p className="mt-3 text-2xl font-bold text-brand-ink" dir="auto">
                  {priceLabel(l)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {l.areaSqm && <Fact icon={<Ruler />} label={t('acquire.area')} value={t('properties.area', { value: l.areaSqm })} />}
                  {l.rooms && <Fact icon={<DoorOpen />} label={t('acquire.rooms')} value={tp('rooms', l.rooms)} />}
                  {l.bedrooms && <Fact icon={<BedDouble />} label={t('acquire.bedrooms')} value={String(l.bedrooms)} />}
                </div>
              </div>
            </Card>

            <section aria-labelledby="about">
              <SectionHeading id="about" title={t('acquire.about')} />
              <Card className="p-4 text-sm leading-relaxed text-ink-soft">{l.description[locale]}</Card>
              {l.features.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('acquire.features')}>
                  {l.features.map((a) => (
                    <li key={a}>
                      <Badge tone="muted" className="border border-line bg-surface py-1 text-ink-soft">
                        {t(`amenities.${a}`)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <InterestForm listing={l} />
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-control bg-sunken/70 p-3">
      <span className="text-muted [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <p className="mt-1.5 text-xs text-muted">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  )
}

type FormErrors = Partial<Record<'name' | 'phone' | 'email', TKey>>

function InterestForm({ listing }: { listing: Listing }) {
  const { t } = useI18n()
  const [values, setValues] = useState({ name: '', phone: '', email: '', message: '', preferredContact: 'phone' as 'phone' | 'email' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!values.name.trim()) e.name = 'validation.nameRequired'
    if (!isValidPhone(values.phone)) e.phone = 'validation.phoneInvalid'
    if (values.preferredContact === 'email' && !values.email.trim()) e.email = 'validation.emailRequired'
    else if (values.email.trim() && !isValidEmail(values.email)) e.email = 'validation.emailInvalid'
    return e
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (inFlight.current) return
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    inFlight.current = true
    setStatus('sending')
    setSubmitError(null)
    try {
      await services.listings.submitInterest({ listingId: listing.id, ...values })
      setStatus('done')
    } catch (err) {
      setSubmitError(t(`errors.${errorCode(err)}`))
      setStatus('idle')
    } finally {
      inFlight.current = false
    }
  }

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }))

  if (status === 'done')
    return (
      <Card className="flex flex-col items-center p-6 text-center" role="status">
        <CircleCheck className="size-10 text-success-ink" aria-hidden />
        <h2 className="mt-3 text-base font-bold text-ink">{t('acquire.form.successTitle')}</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted">{t('acquire.form.successBody')}</p>
      </Card>
    )

  return (
    <section aria-labelledby="interest">
      <SectionHeading id="interest" title={t('acquire.form.title')} />
      <Card className="p-4 sm:p-5">
        <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4">
          <TextField label={t('acquire.form.name')} value={values.name} onChange={set('name')} autoComplete="name" error={errors.name && t(errors.name)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('acquire.form.phone')}
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={values.phone}
              onChange={set('phone')}
              autoComplete="tel"
              error={errors.phone && t(errors.phone)}
              className="rtl:text-end"
            />
            <TextField
              label={t('acquire.form.email')}
              type="email"
              dir="ltr"
              optionalLabel={values.preferredContact === 'phone' ? t('common.optional') : undefined}
              value={values.email}
              onChange={set('email')}
              autoComplete="email"
              error={errors.email && t(errors.email)}
              className="rtl:text-end"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">{t('acquire.form.preferredContact')}</legend>
            <div className="flex gap-2">
              {(['phone', 'email'] as const).map((c) => (
                <label
                  key={c}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                    values.preferredContact === c ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink-soft',
                  )}
                >
                  <input
                    type="radio"
                    name="preferredContact"
                    className="sr-only"
                    checked={values.preferredContact === c}
                    onChange={() => setValues((v) => ({ ...v, preferredContact: c }))}
                  />
                  {c === 'phone' ? t('acquire.form.phone') : t('acquire.form.email')}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea
            label={t('acquire.form.message')}
            optionalLabel={t('common.optional')}
            placeholder={t('acquire.form.messagePlaceholder')}
            value={values.message}
            onChange={set('message')}
            rows={3}
            maxLength={800}
            className="min-h-24"
          />
          {submitError && <InlineAlert tone="error">{submitError}</InlineAlert>}
          <Button type="submit" size="lg" block loading={status === 'sending'}>
            {status === 'sending' ? t('common.sending') : t('acquire.form.submit')}
          </Button>
        </form>
      </Card>
    </section>
  )
}
