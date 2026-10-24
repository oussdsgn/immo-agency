import { BadgeAlert, Building2, ChevronDown, Flame, Phone, PhoneCall, ShieldAlert, Siren, WifiOff, Zap, type LucideIcon } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { EMERGENCY_NUMBERS, SAFETY_TIPS, type EmergencyNumber } from '@/data/emergency'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { services } from '@/services'
import type { Property } from '@/types'

const ICONS: Record<EmergencyNumber['icon'], LucideIcon> = { flame: Flame, shield: ShieldAlert, badge: BadgeAlert, zap: Zap }

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`

/**
 * Emergency numbers and first-response advice. The national numbers and tips
 * are bundled with the app, so they render even when the data source fails.
 */
export function EmergencyPage() {
  const { t } = useI18n()
  const properties = useAsync(() => services.properties.listMyProperties(), [])

  return (
    <>
      <PageHeader title={t('emergency.title')} subtitle={t('emergency.subtitle')} back="/" />
      <div className="animate-fade-up space-y-6">
        <div role="note" className="flex items-start gap-3 rounded-card bg-danger-ink p-4 text-white">
          <Siren className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t('emergency.dangerTitle')}</p>
            <p className="mt-0.5 text-sm text-white/90">{t('emergency.dangerBody')}</p>
          </div>
        </div>

        <section aria-labelledby="national">
          <SectionHeading id="national" title={t('emergency.national')} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {EMERGENCY_NUMBERS.map((n) => {
              const Icon = ICONS[n.icon]
              return (
                <li key={n.id}>
                  <a
                    href={tel(n.number)}
                    aria-label={`${t(`emergency.numbers.${n.id}`)} — ${t('emergency.call', { number: n.number })}`}
                    className="flex min-h-20 items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition-[border-color,transform] hover:border-danger-ink/40 active:scale-[0.99]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger-ink">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{t(`emergency.numbers.${n.id}`)}</span>
                      <span className="mt-0.5 block text-xs text-muted">{t(`emergency.numberHints.${n.id}`)}</span>
                    </span>
                    <span dir="ltr" className="shrink-0 text-2xl font-extrabold text-danger-ink tabular-nums">
                      {n.number}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>

        {properties.data && properties.data.some((p) => p.residenceContact) && (
          <section aria-labelledby="residence">
            <SectionHeading id="residence" title={t('emergency.residence')} />
            <div className="space-y-3">
              {properties.data.map((p) => (
                <ResidenceContacts key={p.id} property={p} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="tips">
          <SectionHeading id="tips" title={t('emergency.tips')} />
          <Card className="divide-y divide-line overflow-hidden">
            {SAFETY_TIPS.map((tip) => (
              <details key={tip.id} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-bold text-ink hover:bg-sunken/60 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{t(`emergency.tipTitles.${tip.id}`)}</span>
                  <ChevronDown className="size-4.5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-sm leading-relaxed text-ink-soft">{t(`emergency.tipBodies.${tip.id}`)}</p>
                  {(properties.data?.length ?? 0) > 0 && (
                    <ButtonLink to={`/signaler?categorie=${tip.category}`} size="sm" variant="soft" className="mt-3">
                      {t('emergency.reportCta')}
                    </ButtonLink>
                  )}
                </div>
              </details>
            ))}
          </Card>
        </section>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <WifiOff className="size-3.5" aria-hidden />
          {t('emergency.offlineNote')}
        </p>
      </div>
    </>
  )
}

function ResidenceContacts({ property }: { property: Property }) {
  const { t } = useI18n()
  const c = property.residenceContact
  if (!c) return null
  const lines = [
    c.emergencyPhone && { label: t('emergency.agencyEmergency'), hint: t('emergency.agencyEmergencyHint'), phone: c.emergencyPhone, urgent: true },
    c.guardPhone && { label: t('emergency.guard'), phone: c.guardPhone },
    c.phone && { label: t('emergency.office'), phone: c.phone },
  ].filter(Boolean) as { label: string; hint?: string; phone: string; urgent?: boolean }[]

  return (
    <Card className="overflow-hidden">
      <p className="flex items-center gap-2 border-b border-line bg-sunken/50 px-4 py-2.5 text-sm font-bold text-ink">
        <Building2 className="size-4 text-muted" aria-hidden />
        <bdi>{property.residenceName}</bdi>
      </p>
      <ul className="divide-y divide-line">
        {lines.map((l) => (
          <li key={l.label}>
            <a href={tel(l.phone)} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-sunken/60">
              {l.urgent ? (
                <PhoneCall className="size-4.5 shrink-0 text-danger-ink" aria-hidden />
              ) : (
                <Phone className="size-4.5 shrink-0 text-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{l.label}</span>
                {l.hint && <span className="block text-xs text-muted">{l.hint}</span>}
              </span>
              <span dir="ltr" className="shrink-0 text-sm font-semibold text-ink-soft">
                {l.phone}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="px-4 pt-1 pb-3 text-xs text-muted">{t('common.fictionalData')}</p>
    </Card>
  )
}
