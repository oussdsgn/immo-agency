import { Building2, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { Button } from '@/components/ui/Button'
import { Card, CardLink } from '@/components/ui/Card'
import { FieldError, TextField } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useAsync } from '@/lib/useAsync'
import { emitChange } from '@/services/events'
import type { BuildingVisual } from '@/types'
import { isOpenStatus, listReports } from '@dash/lib/data'
import { errorMessage, q, requireDb } from '@dash/lib/supabase'

async function load() {
  const db = requireDb()
  const [residences, reports] = await Promise.all([
    q(db.from('residences').select('id, name, address, city, palette, style, floors, buildings(id, units(id))').order('name')),
    listReports(),
  ])
  return residences.map((r) => ({
    ...r,
    units: r.buildings.reduce((n, b) => n + b.units.length, 0),
    open: reports.filter((x) => x.unit?.building?.residence?.id === r.id && isOpenStatus(x.status)).length,
  }))
}

export function ResidencesPage() {
  const state = useAsync(load, [], ['reports', 'all'])
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader
        title="Immeubles"
        subtitle="Résidences, bâtiments, logements et occupants"
        actions={
          <Button size="sm" onClick={() => setCreating(true)} icon={<Plus className="size-4" aria-hidden />}>
            Nouvelle résidence
          </Button>
        }
      />
      {creating && <CreateResidence onClose={() => setCreating(false)} />}
      <AsyncBoundary state={state}>
        {(list) =>
          list.length === 0 ? (
            <Card>
              <EmptyState icon={<Building2 />} title="Aucune résidence" body="Créez votre première résidence pour y ajouter des bâtiments et des logements." />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => (
                <CardLink key={r.id} to={`/immeubles/${r.id}`} className="overflow-hidden">
                  <div className="aspect-[16/7] bg-sunken">
                    <BuildingIllustration visual={{ palette: r.palette, style: r.style, floors: r.floors } as BuildingVisual} />
                  </div>
                  <div className="p-4">
                    <h2 className="font-bold text-ink">{r.name}</h2>
                    <p className="text-sm text-muted">{[r.address, r.city].filter(Boolean).join(', ')}</p>
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
                      <span>{r.buildings.length} bâtiment{r.buildings.length > 1 ? 's' : ''}</span>
                      <span>{r.units} logement{r.units > 1 ? 's' : ''}</span>
                      <span className={r.open ? 'text-brand-ink' : ''}>
                        {r.open} signalement{r.open > 1 ? 's' : ''} ouvert{r.open > 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                </CardLink>
              ))}
            </div>
          )
        }
      </AsyncBoundary>
    </>
  )
}

function CreateResidence({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [v, setV] = useState({ name: '', address: '', city: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (v.name.trim().length < 2) return setError('Indiquez le nom de la résidence.')
    setBusy(true)
    try {
      const row = await q(requireDb().from('residences').insert({ name: v.name.trim(), address: v.address.trim(), city: v.city.trim() }).select('id').single())
      emitChange('all')
      navigate(`/immeubles/${row.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="text-base font-bold text-ink">Nouvelle résidence</h2>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-3">
        <TextField label="Nom" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Résidence Les Oliviers" />
        <TextField label="Adresse" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
        <TextField label="Ville" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} placeholder="Alger" />
        {error && (
          <div className="sm:col-span-3">
            <FieldError>{error}</FieldError>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-3">
          <Button type="submit" loading={busy}>
            Créer et ajouter des logements
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  )
}
