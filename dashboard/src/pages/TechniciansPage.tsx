import { HardHat, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Controls'
import { FieldError, SelectField, TextField } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { REPORT_CATEGORIES } from '@/data/categories'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { emitChange } from '@/services/events'
import { listTechnicians } from '@dash/lib/data'
import { addTechnician, setTechnicianActive } from '@dash/lib/admin'
import { errorMessage } from '@dash/lib/firebase'

export function TechniciansPage() {
  const { t } = useI18n()
  const toast = useToast()
  const state = useAsync(() => listTechnicians(true), [], ['all'])
  const [v, setV] = useState({ name: '', trade: 'plumbing', phone: '', company: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (v.name.trim().length < 2) return setError('Indiquez le nom du technicien.')
    setBusy(true)
    setError(null)
    try {
      await addTechnician({ name: v.name.trim(), trade: v.trade, phone: v.phone.trim() || null, company: v.company.trim() || null })
      setV({ name: '', trade: v.trade, phone: '', company: '' })
      toast('Technicien ajouté')
      emitChange('all')
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  async function toggle(id: string, active: boolean) {
    try {
      await setTechnicianActive(id, active)
      emitChange('all')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Techniciens" subtitle="Équipe interne et prestataires à qui confier les interventions" />
      <Card className="mb-6 p-5">
        <form onSubmit={add} noValidate className="grid items-end gap-4 md:grid-cols-[2fr_1.5fr_1.5fr_1.5fr_auto]">
          <TextField label="Nom" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="py-2.5" />
          <SelectField label="Métier" value={v.trade} onChange={(e) => setV({ ...v, trade: e.target.value })} className="py-2.5">
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`categories.${c.id}.name`)}
              </option>
            ))}
          </SelectField>
          <TextField label="Téléphone" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className="py-2.5" />
          <TextField label="Société" optionalLabel="facultatif" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} className="py-2.5" />
          <Button type="submit" loading={busy} icon={<Plus className="size-4" aria-hidden />}>
            Ajouter
          </Button>
        </form>
        {error && <FieldError>{error}</FieldError>}
      </Card>
      <AsyncBoundary state={state}>
        {(list) =>
          list.length === 0 ? (
            <Card>
              <EmptyState icon={<HardHat />} title="Aucun technicien" body="Ajoutez les personnes à qui vous confiez les interventions." />
            </Card>
          ) : (
            <Card className="divide-y divide-line px-4">
              {list.map((x) => (
                <Switch
                  key={x.id}
                  checked={x.active}
                  onChange={(on) => void toggle(x.id, on)}
                  label={`${x.name}${x.company ? ` — ${x.company}` : ''}`}
                  hint={`${t(`categories.${x.trade as (typeof REPORT_CATEGORIES)[number]['id']}.name`)}${x.phone ? ` · ${x.phone}` : ''} · ${x.active ? 'Disponible pour les interventions' : 'Inactif'}`}
                />
              ))}
            </Card>
          )
        }
      </AsyncBoundary>
    </>
  )
}
