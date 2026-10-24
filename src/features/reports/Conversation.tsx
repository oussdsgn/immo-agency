import { Building2, MessageSquare, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { DevBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FieldError, TextArea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { MAX_PHOTOS } from '@/domain/reportValidation'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { PreparedPhoto } from '@/lib/images'
import { errorCode, services } from '@/services'
import type { Report } from '@/types'
import { PhotoGallery } from './PhotoGallery'
import { PhotoPicker } from './PhotoPicker'

export function Conversation({ report }: { report: Report }) {
  const { t, f } = useI18n()
  if (report.messages.length === 0)
    return (
      <p className="flex items-start gap-2 text-sm text-muted">
        <MessageSquare className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t('reportDetail.noMessages')}
      </p>
    )

  return (
    <ol className="space-y-4">
      {report.messages.map((m) => {
        const mine = m.author === 'resident'
        return (
          <li key={m.id} className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
            {!mine && (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-white" aria-hidden>
                <Building2 className="size-4" />
              </span>
            )}
            <div className={cn('max-w-[85%] min-w-0', mine && 'text-end')}>
              <div className={cn('mb-1 flex flex-wrap items-center gap-2 text-xs text-muted', mine && 'justify-end')}>
                <span className="font-semibold text-ink-soft">{mine ? t('common.you') : m.authorName}</span>
                <time dateTime={m.at}>{f.dateTime(m.at)}</time>
                {m.simulated && <DevBadge>{t('reportDetail.simulated')}</DevBadge>}
              </div>
              <div
                dir="auto"
                className={cn(
                  'inline-block rounded-2xl px-3.5 py-2.5 text-start text-sm leading-relaxed whitespace-pre-line',
                  mine ? 'rounded-se-md bg-brand text-white' : 'rounded-ss-md bg-sunken text-ink',
                  m.isInfoRequest && !mine && 'border border-attention-ink/25 bg-attention-soft',
                )}
              >
                {m.body}
              </div>
              {m.attachments.length > 0 && (
                <div className={cn('mt-2 flex', mine && 'justify-end')}>
                  <PhotoGallery photos={m.attachments} size="sm" />
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function ReplyComposer({ reportId, onSent }: { reportId: string; onSent?: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<PreparedPhoto[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  async function send() {
    if (inFlight.current) return
    if (!body.trim() && photos.length === 0) {
      setError(t('reportDetail.replyEmpty'))
      return
    }
    inFlight.current = true
    setSending(true)
    setError(null)
    try {
      await services.reports.addResidentMessage(reportId, body, photos)
      setBody('')
      setPhotos([])
      toast(t('reportDetail.replySent'))
      onSent?.()
    } catch (e) {
      // Keep the text and photos so the resident can retry.
      setError(t(`errors.${errorCode(e)}`))
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
    >
      <TextArea
        label={t('reportDetail.replyLabel')}
        placeholder={t('reportDetail.replyPlaceholder')}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={3}
        className="min-h-24"
      />
      <PhotoPicker photos={photos} onChange={setPhotos} max={MAX_PHOTOS} label={t('reportDetail.addPhotos')} />
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" loading={sending} block icon={!sending && <Send className="size-4 flip-rtl" aria-hidden />}>
        {sending ? t('common.sending') : t('common.send')}
      </Button>
    </form>
  )
}
