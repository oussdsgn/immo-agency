import { Megaphone, Send, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FieldError, SelectField, TextArea, TextField } from '@/components/ui/Field'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { emitChange } from '@/services/events'
import { deleteAnnouncement, listAnnouncements, listResidences, publishAnnouncement } from '@dash/lib/admin'
import { errorMessage } from '@dash/lib/firebase'

async function load() {
  return Promise.all([listResidences(), listAnnouncements()])
}

export function AnnouncementsPage() {
  const { f } = useI18n()
  const toast = useToast()
  const state = useAsync(load, [], ['all'])
  return (
    <>
      <PageHeader title="Annonces" subtitle="Informations envoyées aux résidents d’une résidence (coupures, travaux, assemblées…)" />
      <AsyncBoundary state={state}>
        {([residences, list]) => (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Compose residences={residences} />
            <section aria-labelledby="sent" className="min-w-0">
              <SectionHeading id="sent" title="Annonces publiées" />
              {list.length === 0 ? (
                <Card>
                  <EmptyState icon={<Megaphone />} title="Aucune annonce" />
                </Card>
              ) : (
                <div className="space-y-3">
                  {list.map((a) => (
                    <Card key={a.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-ink">{a.titleFr}</h3>
                            {a.important && <Badge tone="brand">Important</Badge>}
                          </div>
                          <p className="text-xs text-muted">
                            {a.residenceName} · {f.dateTime(a.published_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Supprimer l’annonce"
                          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-sunken"
                          onClick={async () => {
                            if (!window.confirm('Supprimer cette annonce ? Elle disparaîtra de l’application des résidents.')) return
                            try {
                              await deleteAnnouncement(a.id)
                              emitChange('all')
                            } catch (err) {
                              toast(errorMessage(err), 'error')
                            }
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">{a.bodyFr}</p>
                      <p lang="ar" dir="rtl" className="mt-2 border-t border-line pt-2 text-sm text-ink-soft">
                        <span className="font-semibold">{a.titleAr}</span> — {a.bodyAr}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}

function Compose({ residences }: { residences: { id: string; name: string }[] }) {
  const toast = useToast()
  const [v, setV] = useState({ residence: residences[0]?.id ?? '', title_fr: '', body_fr: '', title_ar: '', body_ar: '', important: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!v.residence || v.title_fr.trim().length < 3 || v.body_fr.trim().length < 3 || !v.title_ar.trim() || !v.body_ar.trim())
      return setError('Renseignez la résidence, le titre et le texte en français et en arabe.')
    setBusy(true)
    setError(null)
    try {
      await publishAnnouncement({
        residenceId: v.residence,
        residenceName: residences.find((r) => r.id === v.residence)?.name ?? '',
        titleFr: v.title_fr.trim(),
        bodyFr: v.body_fr.trim(),
        titleAr: v.title_ar.trim(),
        bodyAr: v.body_ar.trim(),
        important: v.important,
      })
      setV({ ...v, title_fr: '', body_fr: '', title_ar: '', body_ar: '', important: false })
      toast('Annonce publiée — les résidents sont notifiés')
      emitChange('all')
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  if (residences.length === 0) return <Card className="h-fit p-5 text-sm text-muted">Créez d’abord une résidence dans « Immeubles ».</Card>
  return (
    <Card className="h-fit p-5">
      <h2 className="text-base font-bold text-ink">Nouvelle annonce</h2>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <SelectField label="Résidence" value={v.residence} onChange={(e) => setV({ ...v, residence: e.target.value })} className="py-2.5">
          {residences.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Titre (français)" value={v.title_fr} onChange={(e) => setV({ ...v, title_fr: e.target.value })} maxLength={120} />
        <TextArea label="Texte (français)" value={v.body_fr} onChange={(e) => setV({ ...v, body_fr: e.target.value })} rows={3} className="min-h-20" maxLength={2000} />
        <TextField label="العنوان (بالعربية)" lang="ar" dir="rtl" value={v.title_ar} onChange={(e) => setV({ ...v, title_ar: e.target.value })} maxLength={120} />
        <TextArea label="النص (بالعربية)" lang="ar" dir="rtl" value={v.body_ar} onChange={(e) => setV({ ...v, body_ar: e.target.value })} rows={3} className="min-h-20" maxLength={2000} />
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={v.important} onChange={(e) => setV({ ...v, important: e.target.checked })} className="size-4 accent-[var(--color-brand)]" />
          Marquer comme importante
        </label>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" block loading={busy} icon={<Send className="size-4" aria-hidden />}>
          Publier et notifier les résidents
        </Button>
      </form>
    </Card>
  )
}
