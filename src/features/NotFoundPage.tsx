import { MapPin } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/States'
import { useI18n } from '@/i18n'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <Card className="mt-6">
      <EmptyState
        icon={<MapPin />}
        title={t('errors.pageNotFound')}
        body={t('errors.pageNotFoundBody')}
        action={<ButtonLink to="/">{t('confirmation.backHome')}</ButtonLink>}
      />
    </Card>
  )
}
