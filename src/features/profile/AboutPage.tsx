import { FlaskConical } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { useI18n } from '@/i18n'

const ITEMS = ['auth', 'data', 'photos', 'agency', 'listings'] as const

export function AboutPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('about.title')} back="/profil" />
      <div className="space-y-6">
        <Card className="p-4 text-sm text-ink-soft">{t('about.body')}</Card>
        <section aria-labelledby="mock">
          <SectionHeading id="mock" title={t('about.mockTitle')} />
          <Card className="p-4">
            <ul className="space-y-3">
              {ITEMS.map((k) => (
                <li key={k} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <FlaskConical className="mt-0.5 size-4 shrink-0 text-dev" aria-hidden />
                  {t(`about.mockItems.${k}`)}
                </li>
              ))}
            </ul>
          </Card>
        </section>
        <p className="text-center text-xs text-muted">{t('profile.version', { version: __APP_VERSION__ })}</p>
      </div>
    </>
  )
}
