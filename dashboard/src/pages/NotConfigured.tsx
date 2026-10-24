import { Logo } from '@/components/layout/Logo'
import { Card } from '@/components/ui/Card'

/** Shown when the dashboard is built without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */
export function NotConfigured() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-4">
      <Card className="max-w-lg p-6">
        <Logo />
        <h1 className="mt-5 text-lg font-bold text-ink">Espace agence non configuré</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Ce tableau de bord a besoin du projet Supabase de l’agence. Définissez <code className="rounded bg-sunken px-1">VITE_SUPABASE_URL</code> et{' '}
          <code className="rounded bg-sunken px-1">VITE_SUPABASE_ANON_KEY</code> au moment du build (voir docs/SUPABASE_SETUP.md).
        </p>
      </Card>
    </div>
  )
}
