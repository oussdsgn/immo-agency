import { Users } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { emitChange } from '@/services/events'
import { useStaff } from '@dash/auth/staff'
import { errorMessage, q, requireDb, type UserRole } from '@dash/lib/supabase'

/** Admin only: approve dashboard sign-ups and manage roles. */
export function TeamPage() {
  const { profile } = useStaff()
  const { f } = useI18n()
  const toast = useToast()
  const state = useAsync(
    () => q(requireDb().from('profiles').select('id, full_name, email, role, created_at').neq('role', 'resident').order('created_at')),
    [],
    ['all'],
  )
  if (profile?.role !== 'admin') return <Navigate to="/" replace />

  async function setRole(id: string, role: UserRole) {
    try {
      await q(requireDb().rpc('set_staff_role', { p_profile: id, p_role: role }))
      toast(role === 'pending_staff' ? 'Accès retiré' : 'Rôle mis à jour')
      emitChange('all')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Équipe" subtitle="Validez les demandes d’accès et gérez les rôles" />
      <AsyncBoundary state={state}>
        {(people) => {
          const pending = people.filter((p) => p.role === 'pending_staff')
          const staff = people.filter((p) => p.role !== 'pending_staff')
          return (
            <div className="space-y-6">
              <section aria-labelledby="pending">
                <SectionHeading id="pending" title={`Demandes d’accès (${pending.length})`} />
                <Card className="divide-y divide-line overflow-hidden">
                  {pending.length === 0 && <EmptyState icon={<Users />} title="Aucune demande en attente" className="py-6" />}
                  {pending.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink">{p.full_name || '—'}</p>
                        <p className="text-sm text-muted">
                          {p.email} · demandé {f.relative(p.created_at)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => void setRole(p.id, 'agent')}>
                        Valider comme agent
                      </Button>
                    </div>
                  ))}
                </Card>
              </section>
              <section aria-labelledby="staff">
                <SectionHeading id="staff" title="Membres de l’équipe" />
                <Card className="divide-y divide-line overflow-hidden">
                  {staff.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-bold text-ink">
                          {p.full_name || '—'}
                          {p.id === profile.id && <Badge tone="muted">Vous</Badge>}
                        </p>
                        <p className="text-sm text-muted">{p.email}</p>
                      </div>
                      <Badge tone={p.role === 'admin' ? 'brand' : 'info'}>{p.role === 'admin' ? 'Administrateur' : 'Agent'}</Badge>
                      {p.id !== profile.id && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="border border-line" onClick={() => void setRole(p.id, p.role === 'admin' ? 'agent' : 'admin')}>
                            {p.role === 'admin' ? 'Passer agent' : 'Passer administrateur'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => window.confirm(`Retirer l’accès de ${p.full_name || p.email} ?`) && void setRole(p.id, 'pending_staff')}
                          >
                            Retirer l’accès
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              </section>
            </div>
          )
        }}
      </AsyncBoundary>
    </>
  )
}
