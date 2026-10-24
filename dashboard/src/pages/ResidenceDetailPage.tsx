import { Copy, Plus, RefreshCw, Trash2, UserMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FieldError, SelectField, TextField } from '@/components/ui/Field'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { emitChange } from '@/services/events'
import { useStaff } from '@dash/auth/staff'
import {
  addBuilding,
  addUnit,
  deleteBuilding,
  deleteResidence,
  deleteUnit,
  getResidence,
  regenerateCode,
  removeMember,
  updateResidence,
  type Building,
  type Residence,
} from '@dash/lib/admin'
import { errorMessage } from '@dash/lib/firebase'

const APP_LINK = 'https://github.com/oussdsgn/immo-agency/releases/latest/download/IMMO-Agency.apk'

const load = getResidence

type Data = Awaited<ReturnType<typeof load>>

export function ResidenceDetailPage() {
  const { id = '' } = useParams()
  const state = useAsync(() => load(id), [id], ['all'])
  return (
    <AsyncBoundary state={state} skeleton={<Skeleton className="h-96 rounded-card" />}>
      {(d) => (
        <>
          <PageHeader title={d.residence.name} subtitle={[d.residence.address, d.residence.city].filter(Boolean).join(', ')} back="/immeubles" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ResidenceForm r={d.residence} />
            <div className="min-w-0 space-y-6">
              {d.buildings.map((b) => (
                <BuildingCard key={b.id} b={b} data={d} />
              ))}
              <AddBuilding residenceId={d.residence.id} />
            </div>
          </div>
        </>
      )}
    </AsyncBoundary>
  )
}

function useSave() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save(fn: () => Promise<unknown>, done?: string) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      emitChange('all')
      if (done) toast(done)
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, save }
}

const AMENITIES = ['elevator', 'parking', 'concierge', 'garden', 'pool', 'security'] as const

function ResidenceForm({ r }: { r: Residence }) {
  const { t } = useI18n()
  const { profile } = useStaff()
  const navigate = useNavigate()
  const { busy, error, save } = useSave()
  const [v, setV] = useState({
    name: r.name,
    address: r.address,
    city: r.city,
    manager_name: r.managerName ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    emergency_phone: r.emergencyPhone ?? '',
    guard_phone: r.guardPhone ?? '',
    amenities: r.amenities,
    palette: r.palette,
    style: r.style,
    floors: r.floors,
  })
  const field = (k: keyof typeof v) => ({ value: String(v[k] ?? ''), onChange: (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value }) })
  const nul = (s: string) => s.trim() || null

  return (
    <Card className="h-fit p-5">
      <h2 className="text-base font-bold text-ink">Informations de la résidence</h2>
      <p className="mt-1 text-sm text-muted">Les contacts et numéros d’astreinte s’affichent dans l’application des résidents (écran Urgences).</p>
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void save(
            () =>
              updateResidence(r.id, {
                name: v.name.trim(),
                address: v.address.trim(),
                city: v.city.trim(),
                managerName: nul(v.manager_name),
                phone: nul(v.phone),
                email: nul(v.email),
                emergencyPhone: nul(v.emergency_phone),
                guardPhone: nul(v.guard_phone),
                amenities: v.amenities,
                palette: v.palette,
                style: v.style,
                floors: Number(v.floors) || 4,
              }),
            'Résidence enregistrée',
          )
        }}
      >
        <TextField label="Nom" {...field('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Adresse" {...field('address')} />
          <TextField label="Ville" {...field('city')} />
        </div>
        <TextField label="Gestionnaire" optionalLabel="facultatif" {...field('manager_name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Téléphone agence" type="tel" {...field('phone')} />
          <TextField label="E-mail" type="email" {...field('email')} />
          <TextField label="Astreinte (soirs / week-ends)" type="tel" {...field('emergency_phone')} />
          <TextField label="Gardien / sécurité" type="tel" {...field('guard_phone')} />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Équipements</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <label key={a} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong bg-surface px-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input
                  type="checkbox"
                  checked={v.amenities.includes(a)}
                  onChange={(e) => setV({ ...v, amenities: e.target.checked ? [...v.amenities, a] : v.amenities.filter((x) => x !== a) })}
                  className="accent-[var(--color-brand)]"
                />
                {t(`amenities.${a}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Illustration" {...field('style')} className="py-2.5">
            <option value="block">Immeuble</option>
            <option value="tower">Tour</option>
            <option value="terrace">Terrasses</option>
            <option value="villa">Villa</option>
          </SelectField>
          <SelectField label="Couleur" {...field('palette')} className="py-2.5">
            <option value="sand">Sable</option>
            <option value="terracotta">Terre cuite</option>
            <option value="stone">Pierre</option>
            <option value="olive">Olive</option>
            <option value="sky">Ciel</option>
          </SelectField>
          <TextField label="Étages" type="number" min={1} max={60} {...field('floors')} />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="submit" loading={busy}>
            Enregistrer
          </Button>
          {profile?.role === 'admin' && (
            <Button
              variant="danger"
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={async () => {
                if (!window.confirm(`Supprimer « ${r.name} » ? Impossible si des signalements y sont liés.`)) return
                if (await save(() => deleteResidence(r.id), 'Résidence supprimée')) navigate('/immeubles')
              }}
            >
              Supprimer
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}

function BuildingCard({ b, data }: { b: Building; data: Data }) {
  const toast = useToast()
  const { save, error } = useSave()
  const residence = data.residence

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(done)
    } catch {
      window.prompt('Copiez le texte :', text)
    }
  }

  return (
    <section aria-label={`Bâtiment ${b.name}`}>
      <SectionHeading
        title={`Bâtiment ${b.name} · ${b.units.length} logement${b.units.length > 1 ? 's' : ''}`}
        action={
          b.units.length === 0 && (
            <button
              type="button"
              className="text-sm font-semibold text-danger-ink hover:underline"
              onClick={() => window.confirm(`Supprimer le bâtiment ${b.name} ?`) && void save(() => deleteBuilding(b.id), 'Bâtiment supprimé')}
            >
              Supprimer
            </button>
          )
        }
      />
      <Card className="overflow-hidden">
        {b.units.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-sunken/60 text-start text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2 text-start">Logement</th>
                  <th className="px-4 py-2 text-start">Surface</th>
                  <th className="px-4 py-2 text-start">Code d’accès</th>
                  <th className="px-4 py-2 text-start">Occupants</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {b.units.map((u) => {
                  const code = u.code
                  const people = data.members.filter((m) => m.unitId === u.id)
                  const invite = `Bonjour, voici votre accès à l’application IMMO Agency pour l’appartement ${u.number}, bâtiment ${b.name}, ${residence.name}.\n1. Installez l’application : ${APP_LINK}\n2. Créez votre compte et saisissez le code logement : ${code}`
                  return (
                    <tr key={u.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">Appt {u.number}</p>
                        <p className="text-xs text-muted">{u.floor === null ? '—' : u.floor === 0 ? 'Rez-de-chaussée' : `Étage ${u.floor}`}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {u.areaSqm ? `${u.areaSqm} m²` : '—'}
                        {u.rooms ? ` · ${u.rooms} p.` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold tracking-widest text-ink">{code}</span>
                        <div className="mt-1 flex gap-1">
                          <IconBtn label="Copier l’invitation" onClick={() => void copy(invite, 'Invitation copiée — envoyez-la au résident')}>
                            <Copy className="size-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Générer un nouveau code"
                            onClick={() =>
                              window.confirm('Générer un nouveau code ? L’ancien ne fonctionnera plus (les comptes déjà rattachés restent liés).') &&
                              void save(() => regenerateCode(u.id), 'Nouveau code généré')
                            }
                          >
                            <RefreshCw className="size-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {people.length === 0 ? (
                          <span className="text-xs text-muted">Aucun compte rattaché</span>
                        ) : (
                          <ul className="space-y-1">
                            {people.map((m) => (
                              <li key={m.uid} className="flex items-center gap-2">
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-ink">{m.fullName || m.email}</span>
                                  <span className="block truncate text-xs text-muted">
                                    {m.occupancy === 'owner' ? 'Propriétaire' : 'Locataire'}
                                    {m.phone ? ` · ${m.phone}` : ''}
                                  </span>
                                </span>
                                <IconBtn
                                  label="Retirer l’accès"
                                  onClick={() =>
                                    window.confirm(`Retirer l’accès de ${m.fullName || 'ce résident'} à ce logement ?`) &&
                                    void save(() => removeMember(m.uid, u.id), 'Accès retiré')
                                  }
                                >
                                  <UserMinus className="size-3.5" />
                                </IconBtn>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <IconBtn
                          label="Supprimer le logement"
                          onClick={() => window.confirm(`Supprimer l’appartement ${u.number} ?`) && void save(() => deleteUnit(u), 'Logement supprimé')}
                        >
                          <Trash2 className="size-3.5" />
                        </IconBtn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && (
          <div className="px-4 pt-3">
            <FieldError>{error}</FieldError>
          </div>
        )}
        <AddUnit building={b} />
      </Card>
    </section>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink">
      {children}
    </button>
  )
}

function AddUnit({ building }: { building: Building }) {
  const { busy, error, save } = useSave()
  const [v, setV] = useState({ number: '', floor: '', area: '', rooms: '' })
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!v.number.trim()) return
    const ok = await save(
      () => addUnit(building, { number: v.number.trim(), floor: num(v.floor), areaSqm: num(v.area), rooms: num(v.rooms) }),
      'Logement ajouté — son code d’accès est prêt',
    )
    if (ok) setV({ number: '', floor: '', area: '', rooms: '' })
  }
  return (
    <form onSubmit={submit} className="grid items-end gap-3 border-t border-line bg-sunken/30 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <TextField label="N° appt" value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} className="py-2" />
      <TextField label="Étage" type="number" value={v.floor} onChange={(e) => setV({ ...v, floor: e.target.value })} className="py-2" />
      <TextField label="Surface m²" type="number" value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })} className="py-2" />
      <TextField label="Pièces" type="number" value={v.rooms} onChange={(e) => setV({ ...v, rooms: e.target.value })} className="py-2" />
      <Button type="submit" loading={busy} disabled={!v.number.trim()} icon={<Plus className="size-4" aria-hidden />}>
        Ajouter
      </Button>
      {error && (
        <div className="sm:col-span-5">
          <FieldError>{error}</FieldError>
        </div>
      )}
    </form>
  )
}

function AddBuilding({ residenceId }: { residenceId: string }) {
  const { busy, error, save } = useSave()
  const [name, setName] = useState('')
  return (
    <Card className="p-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (name.trim() && (await save(() => addBuilding(residenceId, name), 'Bâtiment ajouté'))) setName('')
        }}
      >
        <div className="min-w-40 flex-1">
          <TextField label="Ajouter un bâtiment" placeholder="A, B, Tour Nord…" value={name} onChange={(e) => setName(e.target.value)} className="py-2" />
        </div>
        <Button type="submit" variant="secondary" loading={busy} disabled={!name.trim()} icon={<Plus className="size-4" aria-hidden />}>
          Ajouter
        </Button>
      </form>
      {error && <FieldError>{error}</FieldError>}
    </Card>
  )
}
