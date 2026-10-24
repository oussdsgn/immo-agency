import { Building2, CalendarClock, CircleHelp, Mail, MessageSquare, Phone, Send, Star, UserRound } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CategoryTile } from '@/components/ui/CategoryIcon'
import { FieldError, SelectField, TextArea, TextField } from '@/components/ui/Field'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { AGENCY_TRANSITIONS } from '@/domain/reportWorkflow'
import { PhotoGallery } from '@/features/reports/PhotoGallery'
import { Timeline } from '@/features/reports/Timeline'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import type { Attachment, Report, ReportCategoryId, StatusEvent } from '@/types'
import { dispatch, getReport, isOpenStatus, listTechnicians, requestInfo, sendMessage, setStatus, toLocalInput, unitLabel, type ReportDetail } from '@dash/lib/data'
import { errorMessage, type ReportStatus } from '@dash/lib/firebase'

export function ReportDetailPage() {
  const { id = '' } = useParams()
  const state = useAsync(() => Promise.all([getReport(id), listTechnicians()]), [id], ['reports'])
  return (
    <>
      <PageHeader title="Signalement" back="/signalements" />
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-96 rounded-card" />}>
        {([r, techs]) => <Detail r={r} techs={techs} />}
      </AsyncBoundary>
    </>
  )
}

type Tech = Awaited<ReturnType<typeof listTechnicians>>[number]

function Detail({ r, techs }: { r: ReportDetail; techs: Tech[] }) {
  const { t, f } = useI18n()
  const open = isOpenStatus(r.status)

  // Reuse the resident app's timeline and gallery components.
  const history: StatusEvent[] = r.events.map((e) => ({
    id: e.id,
    status: e.status,
    at: e.at,
    note: e.note ?? undefined,
    source: e.source as StatusEvent['source'],
    technicianName: e.technician_name ?? undefined,
    scheduledAt: e.scheduled_at ?? undefined,
  }))
  const photos = (list: ReportDetail['photos']): Attachment[] =>
    list.map((p) => ({ id: p.id, url: p.url, name: p.name, sizeBytes: p.size_bytes, addedAt: p.at, addedBy: p.added_kind as Attachment['addedBy'] }))

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold text-ink-soft">#{r.reference}</span>
            <div className="flex flex-wrap items-center gap-2">
              <UrgencyBadge urgency={r.urgency} />
              <StatusBadge status={r.status} />
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <CategoryTile id={r.category as ReportCategoryId} size="lg" />
            <div className="min-w-0">
              <h2 className="text-xl leading-snug font-bold text-ink">{r.title}</h2>
              <p className="text-sm text-muted">
                {t(`categories.${r.category as ReportCategoryId}.name`)} · {t(`locations.${r.location as Report['location']}`)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{r.description}</p>
          <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <Info icon={<Building2 />} label="Logement" value={unitLabel(r)} />
            <Info icon={<CalendarClock />} label="Reçu" value={`${f.dateTime(r.created_at)} (${f.relative(r.created_at)})`} />
            <Info icon={<UserRound />} label="Résident" value={r.resident?.full_name || '—'} />
            <div className="flex flex-wrap gap-2 sm:items-end">
              {r.resident?.phone && (
                <a href={`tel:${r.resident.phone.replace(/[^\d+]/g, '')}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                  <Phone className="size-4" aria-hidden />
                  {r.resident.phone}
                </a>
              )}
              {r.resident?.email && (
                <a href={`mailto:${r.resident.email}`} className={buttonClass({ variant: 'ghost', size: 'sm' }, 'border border-line')}>
                  <Mail className="size-4" aria-hidden />
                  E-mail
                </a>
              )}
            </div>
          </dl>
        </Card>

        {r.photos.length > 0 && (
          <section aria-labelledby="photos">
            <SectionHeading id="photos" title={`Photos (${r.photos.length})`} />
            <PhotoGallery photos={photos(r.photos)} />
          </section>
        )}

        <section aria-labelledby="conv">
          <SectionHeading id="conv" title="Échanges avec le résident" />
          <Card className="p-5">
            {r.messages.length === 0 ? (
              <p className="text-sm text-muted">Aucun message pour le moment.</p>
            ) : (
              <ol className="space-y-4">
                {r.messages.map((m) => {
                  const agency = m.author_kind === 'agency'
                  const att = photos(r.photos.filter((p) => p.message_id === m.id))
                  return (
                    <li key={m.id} className={cn('flex', agency && 'justify-end')}>
                      <div className={cn('max-w-[85%]', agency && 'text-end')}>
                        <p className="mb-1 text-xs text-muted">
                          <span className="font-semibold text-ink-soft">{agency ? `${m.author_name || 'Agence'} (agence)` : m.author_name || 'Résident'}</span> · {f.dateTime(m.at)}
                          {m.is_info_request && <span className="ms-2 font-semibold text-attention-ink">Demande d’informations</span>}
                        </p>
                        <div
                          className={cn(
                            'inline-block rounded-2xl px-3.5 py-2.5 text-start text-sm whitespace-pre-line',
                            agency ? 'rounded-se-md bg-ink text-white' : 'rounded-ss-md bg-sunken text-ink',
                          )}
                        >
                          {m.body || '—'}
                        </div>
                        {att.length > 0 && (
                          <div className={cn('mt-2 flex', agency && 'justify-end')}>
                            <PhotoGallery photos={att} size="sm" />
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            {r.status !== 'closed' && r.status !== 'rejected' && (
              <div className="mt-5 border-t border-line pt-5">
                <MessageForm reportId={r.id} />
              </div>
            )}
          </Card>
        </section>
      </div>

      <div className="min-w-0 space-y-6">
        {r.feedback_at && (
          <Card className="border-success-ink/25 bg-success-soft/50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-success-ink">
              <Star className="size-4 fill-current" aria-hidden />
              Avis du résident : {r.feedback_rating} / 5
            </p>
            {r.feedback_comment && <p className="mt-1 text-sm text-ink-soft">“{r.feedback_comment}”</p>}
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-base font-bold text-ink">Statut</h2>
          <StatusActions r={r} />
        </Card>

        {open && (
          <Card className="p-5">
            <h2 className="text-base font-bold text-ink">{r.technician ? 'Réassigner l’intervention' : 'Planifier une intervention'}</h2>
            {r.technician && r.scheduled_at && (
              <p className="mt-1 text-sm text-muted">
                Actuellement : <span className="font-semibold text-ink">{r.technician.name}</span>, {f.dateTime(r.scheduled_at)}
              </p>
            )}
            <DispatchForm r={r} techs={techs} />
          </Card>
        )}

        {open && (AGENCY_TRANSITIONS[r.status].includes('awaiting_resident') || r.status === 'awaiting_resident') && (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <CircleHelp className="size-4.5 text-attention-ink" aria-hidden />
              Demander des informations
            </h2>
            <p className="mt-1 text-sm text-muted">Le résident est notifié et le signalement passe « Informations requises ».</p>
            <InfoRequestForm reportId={r.id} />
          </Card>
        )}

        <section aria-labelledby="timeline">
          <SectionHeading id="timeline" title="Historique" />
          <Card className="p-5">
            <Timeline report={{ status: r.status, history } as Report} />
          </Card>
        </section>
      </div>
    </div>
  )
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="font-semibold text-ink">{value}</dd>
      </div>
    </div>
  )
}

function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function run(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key)
    setError(null)
    try {
      await fn()
      if (done) toast(done)
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, run }
}

const ACTION_LABEL: Partial<Record<ReportStatus, string>> = {
  under_review: 'Prendre en charge',
  in_progress: 'Passer en traitement',
  resolved: 'Marquer comme résolu',
  closed: 'Clôturer',
  rejected: 'Refuser',
}

function StatusActions({ r }: { r: ReportDetail }) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [note, setNote] = useState('')
  const options = AGENCY_TRANSITIONS[r.status].filter((s) => s !== 'awaiting_resident')
  if (options.length === 0) return <p className="mt-2 text-sm text-muted">Dossier terminé — aucune action possible.</p>
  return (
    <div className="mt-3 space-y-3">
      <TextField label="Note pour le résident" optionalLabel="facultatif" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ex. : Pièce commandée, intervention jeudi" />
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === 'rejected' ? 'danger' : s === 'resolved' ? 'primary' : 'secondary'}
            loading={busy === s}
            disabled={!!busy}
            onClick={async () => {
              if (s === 'rejected' && !window.confirm('Refuser ce signalement ? Le résident sera notifié.')) return
              if (await run(s, () => setStatus(r.id, s, note), `Statut : ${t(`status.${s}`)}`)) setNote('')
            }}
          >
            {ACTION_LABEL[s] ?? t(`status.${s}`)}
          </Button>
        ))}
      </div>
      {r.status === 'resolved' && !r.feedback_at && <p className="text-xs text-muted">En attente de la confirmation du résident.</p>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

function DispatchForm({ r, techs }: { r: ReportDetail; techs: Tech[] }) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [tech, setTech] = useState(r.assignee_id ?? '')
  // Default appointment: tomorrow 9:00.
  const [when, setWhen] = useState(() => {
    if (r.scheduled_at) return toLocalInput(new Date(r.scheduled_at))
    const d = new Date(Date.now() + 86_400_000)
    d.setHours(9, 0, 0, 0)
    return toLocalInput(d)
  })
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  // Technicians whose trade matches the issue are listed first.
  const sorted = [...techs].sort((a, b) => Number(b.trade === r.category) - Number(a.trade === r.category) || a.name.localeCompare(b.name))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!tech) return setFormError('Choisissez un technicien.')
    if (!when) return setFormError('Choisissez une date.')
    setFormError(null)
    if (await run('dispatch', () => dispatch(r.id, tech, new Date(when).toISOString(), note), 'Intervention planifiée — le résident est notifié')) setNote('')
  }

  if (techs.length === 0) return <p className="mt-2 text-sm text-muted">Ajoutez d’abord un technicien dans « Techniciens ».</p>
  return (
    <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
      <SelectField label="Technicien" value={tech} onChange={(e) => setTech(e.target.value)} className="py-2.5">
        <option value="">Choisir…</option>
        {sorted.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
            {x.company ? ` — ${x.company}` : ''} ({t(`categories.${x.trade as ReportCategoryId}.name`)})
          </option>
        ))}
      </SelectField>
      <TextField label="Date et heure" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      <TextField label="Note" optionalLabel="facultatif" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ex. : Le technicien appellera 30 min avant" />
      {(formError || error) && <FieldError>{formError || error}</FieldError>}
      <Button type="submit" block loading={busy === 'dispatch'} icon={<CalendarClock className="size-4" aria-hidden />}>
        {r.technician ? 'Mettre à jour l’intervention' : 'Planifier et notifier'}
      </Button>
    </form>
  )
}

function InfoRequestForm({ reportId }: { reportId: string }) {
  const { busy, error, run } = useAction()
  const [body, setBody] = useState('')
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (body.trim().length < 5) return
        if (await run('info', () => requestInfo(reportId, body), 'Demande envoyée au résident')) setBody('')
      }}
    >
      <TextArea label="Question" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="min-h-20" maxLength={1000} placeholder="Ex. : Pouvez-vous envoyer une photo du compteur ?" />
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" variant="secondary" block loading={busy === 'info'} disabled={body.trim().length < 5}>
        Envoyer la demande
      </Button>
    </form>
  )
}

function MessageForm({ reportId }: { reportId: string }) {
  const { busy, error, run } = useAction()
  const [body, setBody] = useState('')
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!body.trim()) return
        if (await run('msg', () => sendMessage(reportId, body), 'Message envoyé')) setBody('')
      }}
    >
      <TextArea label="Répondre au résident" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="min-h-20" maxLength={1000} />
      {error && <FieldError>{error}</FieldError>}
      <div className="flex justify-end">
        <Button type="submit" loading={busy === 'msg'} disabled={!body.trim()} icon={<Send className="size-4" aria-hidden />}>
          Envoyer
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MessageSquare className="size-3.5" aria-hidden />
        Le résident reçoit une notification dans l’application.
      </p>
    </form>
  )
}
