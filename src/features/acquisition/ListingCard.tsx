import { BedDouble, MapPin, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { CardLink } from '@/components/ui/Card'
import { useI18n } from '@/i18n'
import type { Listing } from '@/types'
import { usePriceLabel } from './usePriceLabel'

export function ListingCard({ listing }: { listing: Listing }) {
  const { t, tp, locale } = useI18n()
  const priceLabel = usePriceLabel()
  return (
    <CardLink to={`/acquerir/${listing.id}`} className="overflow-hidden">
      <div className="relative aspect-[16/9] bg-sunken">
        <BuildingIllustration visual={listing.visual} />
        <Badge tone="brand" className="absolute start-3 top-3 bg-surface/90 backdrop-blur">
          {t(`acquire.filters.${listing.transaction}`)}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="leading-snug font-bold text-ink">{listing.title[locale]}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {[listing.district, listing.city].filter(Boolean).join(', ')}
        </p>
        <p className="mt-3 text-base font-bold text-brand-ink" dir="auto">
          {priceLabel(listing)}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {listing.areaSqm && (
            <span className="inline-flex items-center gap-1">
              <Ruler className="size-3.5 text-muted" aria-hidden />
              {t('properties.area', { value: listing.areaSqm })}
            </span>
          )}
          {listing.rooms && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-3.5 text-muted" aria-hidden />
              {tp('rooms', listing.rooms)}
            </span>
          )}
        </div>
      </div>
    </CardLink>
  )
}
