import { Inbox, Mail, Phone } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import { emitChange } from '@/services/events'
import { errorMessage, q, requireDb } from '@dash/lib/supabase'

export function LeadsPage() {
  const { f } = useI18n()
  const toast = useToast()
  const state = useAsync(
    () => q(requireDb().from('interest_requests').select('*, listing:listings(title_fr, city)').order('at', { ascending: false }).limit(200)),
    [],
    ['all'],
  )
  return (
    <>
      <PageHeader title="Demandes d’achat / location" subtitle="Résidents intéressés par un bien de la rubrique « Acquérir »" />
      <AsyncBoundary state={state}>
        {(list) =>
          list.length === 0 ? (
            <Card>
              <EmptyState icon={<Inbox />} title="Aucune demande" />
            </Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {list.map((l) => {
                const listing = l.listing as { title_fr: string; city: string } | null
                return (
                  <div key={l.id} className={cn('flex flex-wrap items-start gap-4 p-4', l.handled && 'opacity-60')}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{l.name}</p>
                      <p className="text-sm text-ink-soft">
                        {listing?.title_fr} · {listing?.city}
                      </p>
                      {l.message && <p className="mt-1 text-sm text-ink-soft">“{l.message}”</p>}
                      <p className="mt-1 text-xs text-muted">
                        {f.dateTime(l.at)} · préfère être contacté par {l.preferred_contact === 'phone' ? 'téléphone' : 'e-mail'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft hover:border-line-strong">
                        <Phone className="size-3.5" aria-hidden />
                        {l.phone}
                      </a>
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft hover:border-line-strong">
                          <Mail className="size-3.5" aria-hidden />
                          {l.email}
                        </a>
                      )}
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
                        <input
                          type="checkbox"
                          checked={l.handled}
                          className="size-4 accent-[var(--color-brand)]"
                          onChange={async (e) => {
                            try {
                              await q(requireDb().from('interest_requests').update({ handled: e.target.checked }).eq('id', l.id))
                              emitChange('all')
                            } catch (err) {
                              toast(errorMessage(err), 'error')
                            }
                          }}
                        />
                        Traitée
                      </label>
                    </div>
                  </div>
                )
              })}
            </Card>
          )
        }
      </AsyncBoundary>
    </>
  )
}
