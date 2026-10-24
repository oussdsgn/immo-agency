import { FlaskConical, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AGENCY_TRANSITIONS } from '@/domain/reportWorkflow'
import { useI18n } from '@/i18n'
import { errorCode, services } from '@/services'
import type { Report, ReportStatus } from '@/types'

/**
 * DEVELOPMENT ONLY — imitates agency-side updates so the timeline,
 * notifications and info-request flow can be demonstrated. Rendered only
 * when the mock data source exposes `services.dev`.
 */
export function AgencySimulator({ report }: { report: Report }) {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const dev = services.dev
  if (!dev) return null
  const transitions = AGENCY_TRANSITIONS[report.status]

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toast(t(`errors.${errorCode(e)}`), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="simulator" className="rounded-card border-2 border-dashed border-dev/35 bg-dev-soft/60 p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4.5 text-dev" aria-hidden />
        <h2 id="simulator" className="text-sm font-bold text-dev">
          {t('simulator.title')}
        </h2>
        <span className="rounded-full bg-dev px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-white uppercase">
          {t('simulator.badge')}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-dev/90">{t('simulator.body')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {transitions.length === 0 && <p className="text-xs font-semibold text-dev">{t('simulator.noTransitions')}</p>}
        {transitions.map((s: ReportStatus) => (
          <Button
            key={s}
            size="sm"
            variant="dev"
            loading={busy === s}
            disabled={!!busy}
            onClick={() => run(s, () => dev.simulateAgencyStatus(report.id, s, s === 'awaiting_resident'))}
          >
            {s === 'awaiting_resident' ? t('simulator.withInfoRequest') : t('simulator.moveTo', { status: t(`status.${s}`) })}
          </Button>
        ))}
        {transitions.length > 0 && (
          <Button
            size="sm"
            variant="dev"
            loading={busy === 'msg'}
            disabled={!!busy}
            icon={<MessageSquare className="size-3.5" aria-hidden />}
            onClick={() => run('msg', () => dev.simulateAgencyMessage(report.id, t('simulator.messageBody')))}
          >
            {t('simulator.sendMessage')}
          </Button>
        )}
      </div>
    </section>
  )
}
