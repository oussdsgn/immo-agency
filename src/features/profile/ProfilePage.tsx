import { Building2, FlaskConical, Info, LogOut, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DevBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ListRow, Switch } from '@/components/ui/Controls'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { errorCode, IS_MOCK_DATA, services } from '@/services'
import type { NotificationPreferences } from '@/types'

const PREF_KEYS: (keyof NotificationPreferences)[] = ['reportUpdates', 'infoRequests', 'announcements', 'listings']

export function ProfilePage() {
  const { t, f } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirmOut, setConfirmOut] = useState(false)
  const state = useAsync(
    () =>
      Promise.all([
        services.resident.getCurrentResident(),
        services.resident.getPreferences(),
        services.properties.listMyProperties(),
      ]),
    [],
    ['preferences'],
  )
  // Optimistic preference toggles, rolled back on failure.
  const [prefOverride, setPrefOverride] = useState<Partial<NotificationPreferences>>({})

  async function togglePref(key: keyof NotificationPreferences, value: boolean) {
    setPrefOverride((p) => ({ ...p, [key]: value }))
    try {
      await services.resident.updatePreferences({ [key]: value })
      setPrefOverride((p) => {
        const { [key]: _removed, ...rest } = p
        void _removed
        return rest
      })
    } catch (e) {
      setPrefOverride((p) => ({ ...p, [key]: !value }))
      toast(t(`errors.${errorCode(e)}`), 'error')
    }
  }

  return (
    <>
      <PageHeader title={t('profile.title')} />
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-96 rounded-card" />}>
        {([resident, prefs, properties]) => {
          const effective = { ...prefs, ...prefOverride }
          const initials = `${resident.firstName[0] ?? ''}${resident.lastName[0] ?? ''}`
          return (
            <div className="animate-fade-up space-y-6">
              <Card className="flex items-center gap-4 p-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-soft text-xl font-bold text-brand-ink" aria-hidden>
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-ink">
                    {resident.firstName} {resident.lastName}
                  </p>
                  {resident.email && (
                    <p className="truncate text-sm text-muted rtl:text-right" dir="ltr">
                      {resident.email}
                    </p>
                  )}
                  {IS_MOCK_DATA && (
                    <div className="mt-2">
                      <DevBadge>{t('profile.demoAccount')}</DevBadge>
                    </div>
                  )}
                </div>
              </Card>
              {IS_MOCK_DATA && <p className="-mt-3 px-1 text-xs text-muted">{t('profile.demoAccountBody')}</p>}

              <section aria-labelledby="personal">
                <SectionHeading id="personal" title={t('profile.personalInfo')} />
                <Card className="divide-y divide-line overflow-hidden">
                  <ListRow icon={<UserRound />} label={t('acquire.form.name')} value={`${resident.firstName} ${resident.lastName}`} />
                  <ListRow icon={<Mail />} label={t('profile.email')} value={resident.email ? <span dir="ltr">{resident.email}</span> : t('profile.notProvided')} />
                  <ListRow icon={<Phone />} label={t('profile.phone')} value={resident.phone ? <span dir="ltr">{resident.phone}</span> : t('profile.notProvided')} />
                  <ListRow icon={<Building2 />} label={t('profile.myProperties')} value={String(properties.length)} to="/biens" />
                </Card>
                <p className="mt-2 px-1 text-xs text-muted">
                  {t('profile.memberSince')} {f.date(resident.memberSince)}
                </p>
              </section>

              <section aria-labelledby="lang">
                <SectionHeading id="lang" title={t('language.label')} />
                <Card className="p-3">
                  <LanguageSwitch className="flex w-full [&>button]:flex-1" />
                </Card>
              </section>

              <section aria-labelledby="prefs">
                <SectionHeading id="prefs" title={t('profile.notificationPrefs')} />
                <Card className="divide-y divide-line px-4">
                  {PREF_KEYS.map((k) => (
                    <Switch
                      key={k}
                      checked={effective[k]}
                      onChange={(v) => togglePref(k, v)}
                      label={t(`profile.prefs.${k}`)}
                      hint={t(`profile.prefs.${k}Hint`)}
                    />
                  ))}
                </Card>
                <p className="mt-2 px-1 text-xs text-muted">{t('profile.prefsNote')}</p>
              </section>

              <section aria-labelledby="privacy">
                <SectionHeading id="privacy" title={t('profile.privacy')} />
                <Card className="flex gap-3 p-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-ink" aria-hidden />
                  <p className="text-sm text-ink-soft">{t('profile.privacyBody')}</p>
                </Card>
              </section>

              <Card className="divide-y divide-line overflow-hidden">
                <ListRow icon={<Info />} label={t('profile.about')} to="/a-propos" />
                {services.dev && <ListRow icon={<FlaskConical />} label={t('profile.devTools')} to="/dev" />}
                <ListRow icon={<LogOut className="flip-rtl" />} label={t('profile.signOut')} tone="danger" onClick={() => setConfirmOut(true)} />
              </Card>
              <p className="text-center text-xs text-muted">{t('profile.version', { version: __APP_VERSION__ })}</p>

              <ConfirmDialog
                open={confirmOut}
                message={t('profile.signOutConfirm')}
                confirmLabel={t('profile.signOut')}
                onClose={() => setConfirmOut(false)}
                onConfirm={async () => {
                  setConfirmOut(false)
                  await services.auth.signOut()
                  navigate('/connexion', { replace: true })
                }}
              />
            </div>
          )
        }}
      </AsyncBoundary>
    </>
  )
}
