import { ImagePlus, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { FieldError } from '@/components/ui/Field'
import { useI18n } from '@/i18n'
import { PHOTO_ACCEPT, PhotoPrepError, preparePhoto, type PreparedPhoto } from '@/lib/images'

/**
 * Add / preview / replace / remove photos. Files are validated and resized
 * before they enter form state.
 */
export function PhotoPicker({
  photos,
  onChange,
  max,
  label,
  hint,
}: {
  photos: PreparedPhoto[]
  onChange: (photos: PreparedPhoto[]) => void
  max: number
  label: string
  hint?: string
}) {
  const { t, tp } = useI18n()
  const addInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const replaceIndex = useRef<number>(-1)
  const [busy, setBusy] = useState(false)
  const labelId = useId()
  const [error, setError] = useState<string | null>(null)

  async function prepare(files: File[]): Promise<PreparedPhoto[]> {
    const out: PreparedPhoto[] = []
    for (const file of files) {
      try {
        out.push(await preparePhoto(file))
      } catch (e) {
        setError(e instanceof PhotoPrepError ? t(e.key) : t('validation.photoInvalid'))
      }
    }
    return out
  }

  async function handleAdd(list: FileList | null) {
    if (!list?.length) return
    setError(null)
    const room = max - photos.length
    const files = Array.from(list)
    if (files.length > room) setError(t('validation.photoLimit', { max }))
    setBusy(true)
    const prepared = await prepare(files.slice(0, room))
    setBusy(false)
    if (prepared.length) onChange([...photos, ...prepared])
  }

  async function handleReplace(list: FileList | null) {
    const index = replaceIndex.current
    if (!list?.length || index < 0) return
    setError(null)
    setBusy(true)
    const [prepared] = await prepare([list[0]])
    setBusy(false)
    if (prepared) onChange(photos.map((p, i) => (i === index ? prepared : p)))
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink" id={labelId}>
          {label} <span className="font-normal text-muted">({t('common.optional')})</span>
        </span>
        <span className="text-xs text-muted">{tp('photos', photos.length)}</span>
      </div>
      {hint && <p className="mb-2.5 text-xs text-muted">{hint}</p>}

      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" aria-labelledby={labelId}>
        {photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-square overflow-hidden rounded-control border border-line bg-sunken">
            <img src={p.url} alt={p.name} className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink/60 to-transparent p-1.5 pt-6">
              <button
                type="button"
                onClick={() => {
                  replaceIndex.current = i
                  replaceInput.current?.click()
                }}
                className="grid size-8 place-items-center rounded-full bg-white/90 text-ink hover:bg-white"
                aria-label={`${t('newReport.replacePhoto')} — ${p.name}`}
              >
                <RefreshCw className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
                className="grid size-8 place-items-center rounded-full bg-white/90 text-danger-ink hover:bg-white"
                aria-label={`${t('newReport.removePhoto')} — ${p.name}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {photos.length < max && (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => addInput.current?.click()}
              disabled={busy}
              className="flex size-full flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-line-strong bg-surface p-2 text-center text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-ink"
            >
              {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
              {busy ? t('newReport.photoProcessing') : t('newReport.addPhoto')}
            </button>
          </li>
        )}
      </ul>
      {error && <FieldError>{error}</FieldError>}

      <input
        ref={addInput}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="photo-input"
        onChange={(e) => {
          void handleAdd(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void handleReplace(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
