import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n'
import type { Attachment } from '@/types'

export function PhotoGallery({ photos, size = 'md' }: { photos: Attachment[]; size?: 'sm' | 'md' }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<Attachment | null>(null)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
  }, [open])

  return (
    <>
      <ul className={size === 'sm' ? 'flex flex-wrap gap-2' : 'grid grid-cols-3 gap-2.5 sm:grid-cols-4'}>
        {photos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(p)}
              className={
                size === 'sm'
                  ? 'block size-16 overflow-hidden rounded-lg border border-line'
                  : 'block aspect-square w-full overflow-hidden rounded-control border border-line bg-sunken'
              }
            >
              <img src={p.url} alt={p.name} className="size-full object-cover" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto max-h-[90dvh] max-w-[min(92vw,56rem)] overflow-visible bg-transparent p-0 backdrop:bg-ink/80"
      >
        {open && (
          <figure className="relative">
            <img src={open.url} alt={open.name} className="max-h-[85dvh] rounded-card object-contain" />
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="absolute end-2 top-2 grid size-10 place-items-center rounded-full bg-white/90 text-ink"
              aria-label={t('common.close')}
              autoFocus
            >
              <X className="size-5" aria-hidden />
            </button>
          </figure>
        )}
      </dialog>
    </>
  )
}
