import { LogIn, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { isValidEmail } from '@/domain/reportValidation'
import { InlineAlert } from '@/features/reports/new/Steps'
import { db, errorMessage } from '@dash/lib/supabase'
import { isStaffRole, useStaff } from './staff'

export function LoginPage() {
  const { session, profile, ready } = useStaff()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [v, setV] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (ready && session) return <Navigate to={isStaffRole(profile?.role) ? from : '/en-attente'} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!db || busy) return
    setAlert(null)
    if (!isValidEmail(v.email)) return setAlert({ tone: 'error', text: 'Adresse e-mail invalide.' })
    if (v.password.length < 8) return setAlert({ tone: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
    if (mode === 'signUp' && !v.name.trim()) return setAlert({ tone: 'error', text: 'Indiquez votre nom.' })
    setBusy(true)
    try {
      if (mode === 'signIn') {
        const { error } = await db.auth.signInWithPassword({ email: v.email.trim(), password: v.password })
        if (error) throw error
        navigate(from, { replace: true })
      } else {
        const { data, error } = await db.auth.signUp({
          email: v.email.trim(),
          password: v.password,
          options: { data: { full_name: v.name.trim(), app: 'dashboard' }, emailRedirectTo: window.location.href.split('#')[0] },
        })
        if (error) throw error
        if (!data.session) setAlert({ tone: 'info', text: 'Compte créé. Confirmez votre adresse via l’e-mail reçu, puis connectez-vous.' })
      }
    } catch (err) {
      const m = (err as { message?: string }).message ?? ''
      setAlert({
        tone: 'error',
        text: /invalid/i.test(m)
          ? 'E-mail ou mot de passe incorrect.'
          : /not confirmed/i.test(m)
            ? 'Confirmez d’abord votre adresse via l’e-mail reçu.'
            : /registered/i.test(m)
              ? 'Un compte existe déjà avec cette adresse.'
              : errorMessage(err),
      })
    }
    setBusy(false)
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-3 text-sm font-semibold text-muted">Espace agence</p>
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-bold text-ink">{mode === 'signIn' ? 'Connexion' : 'Demander un accès'}</h1>
          {mode === 'signUp' && <p className="mt-1 text-sm text-muted">Un administrateur de l’agence validera votre compte.</p>}
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            {mode === 'signUp' && <TextField label="Nom complet" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="name" />}
            <TextField label="E-mail professionnel" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} autoComplete="email" />
            <TextField
              label="Mot de passe"
              type="password"
              value={v.password}
              onChange={(e) => setV({ ...v, password: e.target.value })}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            />
            {alert && <InlineAlert tone={alert.tone}>{alert.text}</InlineAlert>}
            <Button type="submit" block size="lg" loading={busy} icon={!busy && (mode === 'signIn' ? <LogIn className="size-5" aria-hidden /> : <UserPlus className="size-5" aria-hidden />)}>
              {mode === 'signIn' ? 'Se connecter' : 'Créer le compte'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            {mode === 'signIn' ? 'Nouveau dans l’équipe ? ' : 'Déjà un compte ? '}
            <button
              type="button"
              className="font-semibold text-brand-ink hover:underline"
              onClick={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn')
                setAlert(null)
              }}
            >
              {mode === 'signIn' ? 'Demander un accès' : 'Se connecter'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}
