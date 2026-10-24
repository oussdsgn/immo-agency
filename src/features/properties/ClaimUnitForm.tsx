import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { OccupancyChoice } from '@/features/auth/AccountForms'
import { useI18n } from '@/i18n'
import { errorCode, services } from '@/services'

/** Links the signed-in resident to a unit with the code from the agency. */
export function ClaimUnitForm() {
  const { t } = useI18n()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [occupancy, setOccupancy] = useState<'owner' | 'tenant'>('tenant')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!/^[A-Z0-9]{8}$/.test(code.trim())) {
      setError(t('validation.codeFormat'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await services.properties.claimUnit(code, occupancy)
      toast(t('properties.claimSuccess'))
      setCode('')
    } catch (err) {
      setError(errorCode(err) === 'not_found' ? t('properties.claimInvalid') : t(`errors.${errorCode(err)}`))
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 text-start">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink">{t('properties.claimTitle')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('properties.claimBody')}</p>
        </div>
      </div>
      <TextField
        label={t('auth.unitCode')}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={8}
        autoCapitalize="characters"
        autoComplete="off"
        dir="ltr"
        error={error ?? undefined}
        className="font-mono tracking-[0.2em] rtl:text-end"
      />
      <OccupancyChoice value={occupancy} onChange={setOccupancy} />
      <Button type="submit" loading={busy} block>
        {t('properties.claimSubmit')}
      </Button>
    </form>
  )
}
