import { CircleCheck, LogIn, UserPlus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { isValidEmail, isValidPhone } from '@/domain/reportValidation'
import { InlineAlert } from '@/features/reports/new/Steps'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { errorCode, services, ServiceError } from '@/services'

type Mode = 'signIn' | 'signUp' | 'reset'
type Errors = Partial<Record<'email' | 'password' | 'fullName' | 'phone' | 'unitCode', TKey>>

const CODE_RE = /^[A-Z0-9]{8}$/i

/** Real resident accounts (Firebase): sign in, sign up with a unit code, reset password. */
export function AccountForms({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('signIn')
  const [v, setV] = useState({ email: '', password: '', fullName: '', phone: '', unitCode: '', occupancy: 'tenant' as 'owner' | 'tenant' })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  type Values = typeof v
  // Once errors are shown, re-check as the user types so fixed fields clear.
  const change = (next: Values) => {
    setV(next)
    if (Object.keys(errors).length) setErrors(validate(next))
  }
  const set = (k: keyof Values) => (e: { target: { value: string } }) => change({ ...v, [k]: e.target.value })

  function validate(v: Values): Errors {
    const e: Errors = {}
    if (!isValidEmail(v.email)) e.email = 'validation.emailInvalid'
    if (mode === 'reset') return e
    if (v.password.length < 8) e.password = 'validation.passwordTooShort'
    if (mode === 'signUp') {
      if (!v.fullName.trim()) e.fullName = 'validation.nameRequired'
      if (v.phone.trim() && !isValidPhone(v.phone)) e.phone = 'validation.phoneInvalid'
      if (v.unitCode.trim() && !CODE_RE.test(v.unitCode.trim())) e.unitCode = 'validation.codeFormat'
    }
    return e
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (busy) return
    const e = validate(v)
    setErrors(e)
    setAlert(null)
    if (Object.keys(e).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setBusy(true)
    try {
      if (mode === 'signIn') {
        await services.auth.signIn(v.email, v.password)
        onSignedIn()
        return
      }
      if (mode === 'reset') {
        await services.auth.sendPasswordReset(v.email)
        setAlert({ tone: 'info', text: t('auth.resetSent') })
      } else {
        const session = await services.auth.signUp({
          email: v.email,
          password: v.password,
          fullName: v.fullName,
          phone: v.phone,
          unitCode: v.unitCode,
          occupancy: v.occupancy,
        })
        if (session) {
          onSignedIn()
          return
        }
        setAlert({ tone: 'info', text: t('auth.checkEmail') })
        setMode('signIn')
      }
    } catch (err) {
      const msg = err instanceof ServiceError ? err.message : ''
      setAlert({
        tone: 'error',
        text:
          msg === 'invalid_credentials'
            ? t('auth.invalidCredentials')
            : msg === 'invalid_code'
              ? t('properties.claimInvalid')
              : msg === 'email_taken'
                ? t('auth.emailTaken')
                : msg === 'email_unconfirmed'
                  ? t('auth.checkEmail')
                  : t(`errors.${errorCode(err)}`),
      })
    }
    setBusy(false)
  }

  const err = (k: keyof Errors) => (errors[k] ? t(errors[k]!) : undefined)
  const switchTo = (m: Mode) => {
    setMode(m)
    setErrors({})
    setAlert(null)
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-ink">
        {mode === 'signUp' ? t('auth.signUpTitle') : mode === 'reset' ? t('auth.forgot') : t('auth.signInTitle')}
      </h2>
      <form ref={formRef} noValidate onSubmit={submit} className="mt-4 space-y-4">
        {mode === 'signUp' && (
          <TextField label={t('auth.fullName')} value={v.fullName} onChange={set('fullName')} autoComplete="name" error={err('fullName')} />
        )}
        <TextField
          label={t('auth.email')}
          type="email"
          inputMode="email"
          dir="ltr"
          value={v.email}
          onChange={set('email')}
          autoComplete="email"
          error={err('email')}
          className="rtl:text-end"
        />
        {mode !== 'reset' && (
          <TextField
            label={t('auth.password')}
            type="password"
            value={v.password}
            onChange={set('password')}
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            hint={mode === 'signUp' ? t('auth.passwordHint') : undefined}
            error={err('password')}
          />
        )}
        {mode === 'signUp' && (
          <>
            <TextField
              label={t('auth.phone')}
              optionalLabel={t('common.optional')}
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={v.phone}
              onChange={set('phone')}
              autoComplete="tel"
              error={err('phone')}
              className="rtl:text-end"
            />
            <TextField
              label={t('auth.unitCode')}
              optionalLabel={t('common.optional')}
              value={v.unitCode}
              onChange={(e) => change({ ...v, unitCode: e.target.value.toUpperCase() })}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              dir="ltr"
              hint={t('auth.unitCodeHint')}
              error={err('unitCode')}
              className="font-mono tracking-[0.2em] rtl:text-end"
            />
            <OccupancyChoice value={v.occupancy} onChange={(o) => change({ ...v, occupancy: o })} />
          </>
        )}

        {alert && (
          <InlineAlert tone={alert.tone}>
            {alert.tone === 'info' && <CircleCheck className="me-1 inline size-4 align-text-bottom" aria-hidden />}
            {alert.text}
          </InlineAlert>
        )}

        <Button
          type="submit"
          size="lg"
          block
          loading={busy}
          icon={!busy && (mode === 'signUp' ? <UserPlus className="size-5" aria-hidden /> : <LogIn className="size-5 flip-rtl" aria-hidden />)}
        >
          {mode === 'signUp' ? t('auth.createAccount') : mode === 'reset' ? t('auth.sendReset') : t('auth.signIn')}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {mode === 'signIn' && (
          <>
            <button type="button" className="font-semibold text-brand-ink hover:underline" onClick={() => switchTo('reset')}>
              {t('auth.forgot')}
            </button>
            <p className="text-muted">
              {t('auth.noAccount')}{' '}
              <button type="button" className="font-semibold text-brand-ink hover:underline" onClick={() => switchTo('signUp')}>
                {t('auth.createAccount')}
              </button>
            </p>
          </>
        )}
        {mode !== 'signIn' && (
          <p className="text-muted">
            {t('auth.haveAccount')}{' '}
            <button type="button" className="font-semibold text-brand-ink hover:underline" onClick={() => switchTo('signIn')}>
              {t('auth.signIn')}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export function OccupancyChoice({ value, onChange }: { value: 'owner' | 'tenant'; onChange: (v: 'owner' | 'tenant') => void }) {
  const { t } = useI18n()
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{t('auth.occupancy')}</legend>
      <div className="flex gap-2">
        {(['tenant', 'owner'] as const).map((o) => (
          <label
            key={o}
            className={cn(
              'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
              value === o ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink-soft',
            )}
          >
            <input type="radio" name="occupancy" className="sr-only" checked={value === o} onChange={() => onChange(o)} />
            {t(`properties.role.${o}`)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
