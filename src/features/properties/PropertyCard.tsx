import { ChevronRight, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { CardLink } from '@/components/ui/Card'
import { useI18n } from '@/i18n'
import type { Property } from '@/types'
import { unitLine } from './format'

export function PropertyCard({ property, openReports }: { property: Property; openReports?: number }) {
  const { t, tp } = useI18n()
  return (
    <CardLink to={`/biens/${property.id}`} className="overflow-hidden">
      <div className="relative aspect-[16/7] bg-sunken">
        <BuildingIllustration visual={property.visual} />
        <Badge tone="brand" className="absolute start-3 top-3 bg-surface/90 backdrop-blur">
          {t(`properties.role.${property.role}`)}
        </Badge>
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">{property.residenceName}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{unitLine(t, property)}</p>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {property.address}, {property.city}
            </span>
          </p>
          {!!openReports && (
            <p className="mt-2 text-xs font-semibold text-brand-ink">{tp('activeReports', openReports)}</p>
          )}
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted flip-rtl" aria-hidden />
      </div>
    </CardLink>
  )
}

/** Compact row used on the home screen. */
export function PropertyRow({ property }: { property: Property }) {
  const { t, tp } = useI18n()
  const facts = [
    property.areaSqm && t('properties.area', { value: property.areaSqm }),
    property.rooms && tp('rooms', property.rooms),
  ].filter(Boolean)
  return (
    <CardLink to={`/biens/${property.id}`} className="flex items-center gap-3 p-3">
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-sunken">
        <BuildingIllustration visual={property.visual} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{property.residenceName}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{unitLine(t, property)}</p>
        {facts.length > 0 && <p className="mt-0.5 text-xs text-muted">{facts.join(' · ')}</p>}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted flip-rtl" aria-hidden />
    </CardLink>
  )
}
