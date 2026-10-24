import { BrickWall, Building2, DoorOpen, Droplets, Ellipsis, Sparkles, Thermometer, Wrench, Zap, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ReportCategoryId } from '@/types'

const ICONS: Record<ReportCategoryId, ComponentType<LucideProps>> = {
  plumbing: Wrench,
  water_leak: Droplets,
  electricity: Zap,
  hvac: Thermometer,
  doors_windows: DoorOpen,
  common_areas: Building2,
  structural: BrickWall,
  cleaning: Sparkles,
  other: Ellipsis,
}

export function CategoryIcon({ id, ...props }: { id: ReportCategoryId } & LucideProps) {
  const Icon = ICONS[id] ?? Ellipsis
  return <Icon aria-hidden {...props} />
}

/** Rounded tile used in lists. */
export function CategoryTile({ id, size = 'md' }: { id: ReportCategoryId; size?: 'md' | 'lg' }) {
  return (
    <span
      className={
        size === 'lg'
          ? 'grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand'
          : 'grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand'
      }
    >
      <CategoryIcon id={id} className={size === 'lg' ? 'size-6' : 'size-5'} />
    </span>
  )
}
