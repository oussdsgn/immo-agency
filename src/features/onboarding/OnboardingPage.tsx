import { ArrowLeft, ArrowRight, Bell, Camera, Check, Droplets, Megaphone, Siren, Wrench, Zap } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Logo, LogoMark } from '@/components/layout/Logo'
import { Badge } from '@/components/ui/Badge'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { markOnboardingSeen } from './onboardingState'

const SLIDES = ['welcome', 'report', 'track', 'informed'] as const
type SlideId = (typeof SLIDES)[number]

/**
 * First-launch introduction. Shown once per device; replayable from Profil.
 * Swipe, arrow keys (mirrored in RTL), dots and buttons all move between screens.
 */
export function OnboardingPage() {
  const { t, dir } = useI18n()
  const { session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const last = index === SLIDES.length - 1
  const state = location.state as { from?: string; returnTo?: string } | null

  function finish() {
    markOnboardingSeen()
    if (session) navigate(state?.returnTo ?? '/', { replace: true })
    else navigate('/connexion', { replace: true, state: state?.from ? { from: state.from } : undefined })
  }

  const go = (i: number) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)))

  // Move focus to the new title so screen readers announce each screen.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      const forward = (e.key === 'ArrowRight') === (dir === 'ltr')
      setIndex((i) => Math.max(0, Math.min(SLIDES.length - 1, i + (forward ? 1 : -1))))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dir])

  const slide = SLIDES[index]

  return (
    <div
      className="flex min-h-dvh flex-col bg-canvas"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) < 50) return
        // Swiping toward the reading direction's start goes forward.
        const forward = dir === 'ltr' ? dx < 0 : dx > 0
        go(index + (forward ? 1 : -1))
      }}
    >
      <header className="flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <LanguageSwitch compact />
        {!last && (
          <Button variant="ghost" onClick={finish}>
            {t('onboarding.skip')}
          </Button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]" aria-roledescription="carousel" aria-label={t('onboarding.label')}>
        <div key={slide} className="animate-fade-up flex flex-1 flex-col" role="group" aria-roledescription="slide" aria-label={t('onboarding.slideOf', { current: index + 1, total: SLIDES.length })}>
          <div className="grid flex-1 place-items-center py-4">
            <SlideVisual id={slide} />
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl leading-tight font-bold tracking-tight text-ink outline-none">
            {t(`onboarding.slides.${slide}.title`)}
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{t(`onboarding.slides.${slide}.body`)}</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => go(i)}
              aria-label={t('onboarding.goTo', { number: i + 1 })}
              aria-current={i === index ? 'step' : undefined}
              className="grid h-6 place-items-center px-0.5"
            >
              <span className={cn('block h-2 rounded-full transition-all', i === index ? 'w-6 bg-brand' : 'w-2 bg-line-strong')} />
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          {index > 0 && (
            <Button variant="ghost" size="lg" className="border border-line" onClick={() => go(index - 1)} aria-label={t('onboarding.previous')}>
              <ArrowLeft className="size-5 flip-rtl" aria-hidden />
            </Button>
          )}
          <Button
            size="lg"
            block
            onClick={() => (last ? finish() : go(index + 1))}
            iconEnd={!last && <ArrowRight className="size-5 flip-rtl" aria-hidden />}
          >
            {last ? t('onboarding.start') : t('onboarding.next')}
          </Button>
        </div>
      </main>
    </div>
  )
}

/** Small illustrated vignettes made from the app's own visual language. */
function SlideVisual({ id }: { id: SlideId }) {
  const { t } = useI18n()
  const frame = 'relative w-full max-w-xs'

  if (id === 'welcome')
    return (
      <div className={frame}>
        <div className="overflow-hidden rounded-sheet border border-line bg-sunken shadow-card">
          <div className="aspect-[4/3]">
            <BuildingIllustration visual={{ palette: 'sand', floors: 5, style: 'block' }} />
          </div>
        </div>
        <div className="absolute -bottom-5 start-1/2 -translate-x-1/2 rounded-card border border-line bg-surface px-4 py-3 shadow-raised rtl:translate-x-1/2">
          <Logo />
        </div>
      </div>
    )

  if (id === 'report')
    return (
      <div className={cn(frame, 'grid grid-cols-2 gap-3')}>
        <Tile icon={<Wrench />} label={t('categories.plumbing.name')} active />
        <Tile icon={<Zap />} label={t('categories.electricity.name')} />
        <Tile icon={<Droplets />} label={t('categories.water_leak.name')} />
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-line-strong bg-surface p-4 text-xs font-semibold text-ink-soft">
          <Camera className="size-6 text-brand" aria-hidden />
          {t('newReport.addPhoto')}
        </div>
      </div>
    )

  if (id === 'track')
    return (
      <div className={cn(frame, 'rounded-sheet border border-line bg-surface p-5 shadow-card')}>
        <ol className="space-y-4" aria-hidden>
          {(['submitted', 'in_progress', 'resolved'] as const).map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={cn('grid size-7 place-items-center rounded-full text-white', i < 2 ? 'bg-brand' : 'bg-success-ink')}>
                <Check className="size-4" strokeWidth={3} />
              </span>
              <Badge tone={s === 'resolved' ? 'success' : s === 'in_progress' ? 'progress' : 'neutral'} dot>
                {t(`status.${s}`)}
              </Badge>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-2xl rounded-ss-md bg-sunken px-3.5 py-2.5 text-sm text-ink">{t('feedback.question')}</div>
      </div>
    )

  return (
    <div className={cn(frame, 'grid grid-cols-3 gap-3')} aria-hidden>
      <Bubble icon={<Megaphone className="flip-rtl" />} tone="bg-brand-soft text-brand" />
      <Bubble icon={<Siren />} tone="bg-danger-soft text-danger-ink" />
      <Bubble icon={<Bell />} tone="bg-info-soft text-info-ink" />
      <div className="col-span-3 flex items-center justify-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <LogoMark className="size-10" />
        <span className="text-lg font-bold text-ink">Français</span>
        <span className="text-muted">·</span>
        <span lang="ar" className="text-lg font-bold text-ink">
          العربية
        </span>
      </div>
    </div>
  )
}

function Tile({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-card border bg-surface p-4 text-center text-xs font-bold text-ink shadow-card',
        active ? 'border-brand bg-brand-soft/60' : 'border-line',
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand [&>svg]:size-5" aria-hidden>
        {icon}
      </span>
      {label}
    </div>
  )
}

function Bubble({ icon, tone }: { icon: ReactNode; tone: string }) {
  return <div className={cn('grid aspect-square place-items-center rounded-sheet shadow-card [&>svg]:size-8', tone)}>{icon}</div>
}
