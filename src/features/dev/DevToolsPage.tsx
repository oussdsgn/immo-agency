import { FlaskConical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Controls'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { services } from '@/services'
import type { FailureMode } from '@/services/contracts'

/** Prototype controls: dataset switching and simulated network failures. */
export function DevToolsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const dev = services.dev
  const [failure, setFailure] = useState<FailureMode>(() => dev?.getFailureMode() ?? 'off')
  const [dataset, setDataset] = useState(() => dev?.getDataset() ?? 'demo')
  const [busy, setBusy] = useState<string | null>(null)
  if (!dev) return <Navigate to="/" replace />

  async function reset(ds: 'demo' | 'empty') {
    setBusy(ds)
    await dev!.resetData(ds)
    try {
      sessionStorage.removeItem('immo-agency.reportDraft.v1')
    } catch {
      // ignore
    }
    setDataset(ds)
    setBusy(null)
    toast(t('dev.resetDone'))
  }

  return (
    <>
      <PageHeader title={t('dev.title')} back="/profil" />
      <div className="space-y-6">
        <p className="flex items-start gap-2 rounded-control bg-dev-soft p-3 text-sm font-medium text-dev">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('dev.intro')}
        </p>

        <section aria-labelledby="dataset">
          <SectionHeading id="dataset" title={t('dev.dataset')} />
          <Card className="divide-y divide-line">
            {(['demo', 'empty'] as const).map((ds) => (
              <div key={ds} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{ds === 'demo' ? t('dev.datasetDemo') : t('dev.datasetEmpty')}</p>
                  {dataset === ds && <p className="text-xs text-dev">{t('dev.current')}</p>}
                </div>
                <Button
                  size="sm"
                  variant="dev"
                  loading={busy === ds}
                  disabled={!!busy}
                  onClick={() => reset(ds)}
                  icon={<RotateCcw className="size-3.5" aria-hidden />}
                >
                  {t('dev.reset')}
                </Button>
              </div>
            ))}
          </Card>
        </section>

        <section aria-labelledby="failure">
          <SectionHeading id="failure" title={t('dev.failure')} />
          <Segmented<FailureMode>
            label={t('dev.failure')}
            value={failure}
            onChange={(v) => {
              dev.setFailureMode(v)
              setFailure(v)
            }}
            options={[
              { value: 'off', label: t('dev.failureOff') },
              { value: 'next-write', label: t('dev.failureNext') },
              { value: 'all', label: t('dev.failureAll') },
            ]}
          />
        </section>
      </div>
    </>
  )
}
