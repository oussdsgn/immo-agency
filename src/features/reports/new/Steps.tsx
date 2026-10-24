import { CircleAlert, Info, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { Card } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { FieldError, TextArea, TextField } from '@/components/ui/Field'
import { LOCATIONS } from '@/data/categories'
import {
  DESCRIPTION_MAX,
  MAX_PHOTOS,
  TITLE_MAX,
  type DraftErrors,
  type ReportDraft,
} from '@/domain/reportValidation'
import { unitLine } from '@/features/properties/format'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Property, ReportCategory, Urgency } from '@/types'
import { PhotoPicker } from '../PhotoPicker'

interface StepProps {
  draft: ReportDraft
  update: (patch: Partial<ReportDraft>) => void
  errors: DraftErrors
}

const radioCard =
  'relative flex cursor-pointer rounded-card border border-line bg-surface transition-[border-color,background-color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft/60 has-[:checked]:shadow-[0_0_0_1px_var(--color-brand)] hover:border-line-strong'

export function StepProperty({ draft, update, errors, properties }: StepProps & { properties: Property[] }) {
  const { t } = useI18n()
  return (
    <fieldset>
      <legend className="mb-4 text-lg font-bold text-ink">{t('newReport.propertyQuestion')}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {properties.map((p) => (
          <label key={p.id} className={cn(radioCard, 'items-center gap-3 p-3')}>
            <input
              type="radio"
              name="property"
              className="sr-only"
              checked={draft.propertyId === p.id}
              onChange={() => update({ propertyId: p.id })}
              aria-invalid={Boolean(errors.propertyId) || undefined}
            />
            <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-sunken">
              <BuildingIllustration visual={p.visual} />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-ink">{p.residenceName}</span>
              <span className="mt-0.5 block text-sm text-muted">{unitLine(t, p)}</span>
            </span>
          </label>
        ))}
      </div>
      {errors.propertyId && <FieldError>{t(errors.propertyId as TKey)}</FieldError>}
    </fieldset>
  )
}

export function StepCategory({ draft, update, errors, categories }: StepProps & { categories: ReportCategory[] }) {
  const { t } = useI18n()
  return (
    <fieldset>
      <legend className="mb-4 text-lg font-bold text-ink">{t('newReport.categoryQuestion')}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((c) => (
          <label key={c.id} className={cn(radioCard, 'flex-col items-center gap-2 p-4 text-center')}>
            <input
              type="radio"
              name="category"
              className="sr-only"
              checked={draft.categoryId === c.id}
              onChange={() => update({ categoryId: c.id })}
              aria-invalid={Boolean(errors.categoryId) || undefined}
            />
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
              <CategoryIcon id={c.id} className="size-5.5" />
            </span>
            <span className="text-sm leading-snug font-bold text-ink">{t(`categories.${c.id}.name`)}</span>
            <span className="text-xs leading-snug text-muted">{t(`categories.${c.id}.description`)}</span>
          </label>
        ))}
      </div>
      {errors.categoryId && <FieldError>{t(errors.categoryId as TKey)}</FieldError>}
    </fieldset>
  )
}

const URGENCIES: Urgency[] = ['low', 'normal', 'urgent']

export function StepDetails({ draft, update, errors }: StepProps) {
  const { t } = useI18n()
  const err = (k: keyof DraftErrors) => (errors[k] ? t(errors[k] as TKey) : undefined)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink">{t('newReport.detailsHeading')}</h2>

      <TextField
        label={t('newReport.titleLabel')}
        placeholder={t('newReport.titlePlaceholder')}
        value={draft.title}
        maxLength={TITLE_MAX}
        onChange={(e) => update({ title: e.target.value })}
        error={err('title')}
        counter={`${draft.title.length}/${TITLE_MAX}`}
        name="title"
        autoComplete="off"
      />

      <TextArea
        label={t('newReport.descriptionLabel')}
        placeholder={t('newReport.descriptionPlaceholder')}
        value={draft.description}
        maxLength={DESCRIPTION_MAX}
        onChange={(e) => update({ description: e.target.value })}
        error={err('description')}
        counter={`${draft.description.length}/${DESCRIPTION_MAX}`}
        name="description"
        rows={5}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">{t('newReport.locationLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => (
            <label
              key={loc}
              className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink-soft transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand hover:border-ink-soft/40"
            >
              <input
                type="radio"
                name="location"
                className="sr-only"
                checked={draft.location === loc}
                onChange={() => update({ location: loc })}
                aria-invalid={Boolean(errors.location) || undefined}
              />
              {t(`locations.${loc}`)}
            </label>
          ))}
        </div>
        {errors.location && <FieldError>{t(errors.location as TKey)}</FieldError>}
      </fieldset>

      <PhotoPicker
        photos={draft.photos}
        onChange={(photos) => update({ photos })}
        max={MAX_PHOTOS}
        label={t('newReport.photosLabel')}
        hint={t('newReport.photosHint', { max: MAX_PHOTOS })}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">{t('urgency.label')}</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {URGENCIES.map((u) => (
            <label key={u} className={cn(radioCard, 'flex-col gap-1 p-3.5')}>
              <input
                type="radio"
                name="urgency"
                className="sr-only"
                checked={draft.urgency === u}
                onChange={() => update({ urgency: u })}
              />
              <span className="flex items-center gap-2 text-sm font-bold text-ink">
                <span
                  className={cn(
                    'size-2.5 rounded-full',
                    u === 'low' && 'bg-neutral-ink/50',
                    u === 'normal' && 'bg-progress-ink',
                    u === 'urgent' && 'bg-danger-ink',
                  )}
                  aria-hidden
                />
                {t(`urgency.${u}`)}
              </span>
              <span className="text-xs leading-snug text-muted">{t(`urgency.${u}Hint`)}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-control bg-sunken/80 p-3 text-xs text-ink-soft">
          <Info className="mt-px size-4 shrink-0 text-muted" aria-hidden />
          {t('urgency.disclaimer')}
        </p>
      </fieldset>
    </div>
  )
}

type EditTarget = 'property' | 'category' | 'details'

function ReviewRow({ label, onEdit, children }: { label: string; onEdit?: () => void; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="flex items-start gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="mt-1 text-sm text-ink">{children}</dd>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-brand-ink hover:bg-brand-soft"
          aria-label={`${t('common.edit')} — ${label}`}
        >
          <Pencil className="size-3.5" aria-hidden />
          {t('common.edit')}
        </button>
      )}
    </div>
  )
}

export function StepReview({
  draft,
  property,
  onEdit,
  editTargets,
}: {
  draft: ReportDraft
  property?: Property
  onEdit: (target: EditTarget) => void
  editTargets: EditTarget[]
}) {
  const { t, tp } = useI18n()
  const editFor = (target: EditTarget) => (editTargets.includes(target) ? () => onEdit(target) : undefined)

  return (
    <div>
      <h2 className="text-lg font-bold text-ink">{t('newReport.reviewHeading')}</h2>
      <p className="mt-1 mb-4 text-sm text-muted">{t('newReport.reviewHint')}</p>
      <Card className="px-4">
        <dl className="divide-y divide-line">
          <ReviewRow label={t('reportDetail.property')} onEdit={editFor('property')}>
            {property ? (
              <>
                <span className="font-semibold">{property.residenceName}</span>
                <span className="block text-muted">{unitLine(t, property)}</span>
              </>
            ) : (
              '—'
            )}
          </ReviewRow>
          <ReviewRow label={t('reportDetail.category')} onEdit={editFor('category')}>
            {draft.categoryId && (
              <span className="inline-flex items-center gap-2 font-semibold">
                <CategoryIcon id={draft.categoryId} className="size-4 text-brand" />
                {t(`categories.${draft.categoryId}.name`)}
              </span>
            )}
          </ReviewRow>
          <ReviewRow label={t('newReport.titleLabel')} onEdit={editFor('details')}>
            <span dir="auto" className="block text-start font-semibold">{draft.title}</span>
          </ReviewRow>
          <ReviewRow label={t('reportDetail.description')} onEdit={editFor('details')}>
            <span dir="auto" className="block text-start whitespace-pre-line">{draft.description}</span>
          </ReviewRow>
          <ReviewRow label={t('reportDetail.location')} onEdit={editFor('details')}>
            {draft.location && t(`locations.${draft.location}`)}
          </ReviewRow>
          <ReviewRow label={t('reportDetail.urgency')} onEdit={editFor('details')}>
            <span className={cn('font-semibold', draft.urgency === 'urgent' && 'text-danger-ink')}>{t(`urgency.${draft.urgency}`)}</span>
          </ReviewRow>
          <ReviewRow label={t('reportDetail.photos')} onEdit={editFor('details')}>
            {draft.photos.length ? (
              <span className="mt-1 flex flex-wrap gap-2">
                {draft.photos.map((p) => (
                  <img key={p.id} src={p.url} alt={p.name} className="size-16 rounded-lg border border-line object-cover" />
                ))}
              </span>
            ) : (
              <span className="text-muted">{tp('photos', 0)}</span>
            )}
          </ReviewRow>
        </dl>
      </Card>
    </div>
  )
}

export function InlineAlert({ tone, children, action }: { tone: 'error' | 'info'; children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-card p-4 text-sm',
        tone === 'error' ? 'bg-danger-soft text-danger-ink' : 'bg-dev-soft text-dev',
      )}
    >
      {tone === 'error' ? <CircleAlert className="mt-px size-4.5 shrink-0" aria-hidden /> : <Info className="mt-px size-4.5 shrink-0" aria-hidden />}
      <p className="min-w-0 flex-1 basis-48 font-medium">{children}</p>
      {action}
    </div>
  )
}
