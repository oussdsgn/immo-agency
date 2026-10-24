import { FlaskConical, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { Button } from '@/components/ui/Button'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Logo } from '@/components/layout/Logo'
import { useI18n } from '@/i18n'
import { errorCode, services } from '@/services'

/**
 * Prototype entry screen. There is NO real authentication: the resident
 * sign-in will be delegated to the agency's identity system.
 */
export function SignInPage() {
  const { t } = useI18n()
  const { session, ready } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (ready && session) return <Navigate to={from} replace />

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await services.auth.signInDemo()
      navigate(from, { replace: true })
    } catch (e) {
      setError(t(`errors.${errorCode(e)}`))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="flex justify-end p-4">
        <LanguageSwitch />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10">
        <div className="overflow-hidden rounded-sheet border border-line bg-sunken">
          <div className="aspect-[16/10]">
            <BuildingIllustration visual={{ palette: 'sand', floors: 5, style: 'block' }} />
          </div>
        </div>
        <div className="mt-8">
          <h1>
            <Logo size="lg" />
          </h1>
          <p className="mt-3 text-sm text-muted">{t('common.tagline')}</p>
        </div>
        <h2 className="mt-8 text-lg font-bold text-ink">{t('auth.welcome')}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">{t('auth.body')}</p>

        <div className="mt-auto pt-8">
          <Button size="lg" block loading={busy} onClick={start} icon={!busy && <LogIn className="size-5 flip-rtl" aria-hidden />}>
            {t('auth.demoCta')}
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-center text-sm font-medium text-danger-ink">
              {error}
            </p>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-control bg-dev-soft p-3 text-xs font-medium text-dev">
            <FlaskConical className="mt-px size-4 shrink-0" aria-hidden />
            {t('auth.notice')}
          </p>
        </div>
      </main>
    </div>
  )
}
