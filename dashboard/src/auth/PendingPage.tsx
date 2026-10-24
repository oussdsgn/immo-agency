import { Hourglass, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { InlineAlert } from '@/features/reports/new/Steps'
import { db, errorMessage } from '@dash/lib/supabase'
import { isStaffRole, useStaff } from './staff'

/** Signed in but not (yet) staff: waiting for approval, or a resident account. */
export function PendingPage() {
  const { ready, session, profile, refresh, signOut } = useStaff()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)

  if (!ready) return null
  if (!session) return <Navigate to="/connexion" replace />
  if (isStaffRole(profile?.role)) return <Navigate to="/" replace />
  const resident = profile?.role === 'resident'

  async function bootstrap() {
    if (!db) return
    setBusy(true)
    const { data, error } = await db.rpc('bootstrap_admin')
    setBusy(false)
    if (error) return setMsg({ tone: 'error', text: errorMessage(error) })
    if (data) await refresh()
    else setMsg({ tone: 'info', text: 'Un administrateur existe déjà : demandez-lui de valider votre compte dans « Équipe ».' })
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <Card className="p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-progress-soft text-progress-ink">
            <Hourglass className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink">{resident ? 'Compte résident' : 'Compte en attente de validation'}</h1>
          <p className="mt-2 text-sm text-muted">
            {resident
              ? 'Ce compte est un compte résident : utilisez l’application mobile. L’espace agence est réservé à l’équipe.'
              : `Bonjour ${profile?.full_name || ''}. Un administrateur de l’agence doit valider votre accès avant que vous puissiez voir les signalements.`}
          </p>
          {msg && (
            <div className="mt-4 text-start">
              <InlineAlert tone={msg.tone}>{msg.text}</InlineAlert>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            {!resident && (
              <>
                <Button variant="secondary" onClick={() => void refresh()} icon={<RefreshCw className="size-4" aria-hidden />}>
                  Vérifier à nouveau
                </Button>
                <Button variant="ghost" onClick={bootstrap} loading={busy} icon={<ShieldCheck className="size-4" aria-hidden />} className="border border-line">
                  Première installation : devenir administrateur
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => void signOut()} icon={<LogOut className="size-4" aria-hidden />}>
              Se déconnecter
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
