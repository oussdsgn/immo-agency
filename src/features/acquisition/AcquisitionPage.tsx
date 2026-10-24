import { FlaskConical, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Controls'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState, Skeleton } from '@/components/ui/States'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import { IS_MOCK_DATA, services } from '@/services'
import type { ListingKind, ListingTransaction } from '@/types'
import { ListingCard } from './ListingCard'

type KindFilter = 'all' | ListingKind
type TxFilter = 'all' | ListingTransaction

export function AcquisitionPage() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const kind = (['apartment', 'house'].includes(params.get('type') ?? '') ? params.get('type') : 'all') as KindFilter
  const tx = (['sale', 'rent'].includes(params.get('transaction') ?? '') ? params.get('transaction') : 'all') as TxFilter

  const state = useAsync(
    () =>
      services.listings.listListings({
        kind: kind === 'all' ? undefined : kind,
        transaction: tx === 'all' ? undefined : tx,
      }),
    [kind, tx],
  )

  function set(key: string, v: string) {
    const next = new URLSearchParams(params)
    if (v === 'all') next.delete(key)
    else next.set(key, v)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader title={t('acquire.title')} subtitle={t('acquire.subtitle')} back="/" />
      {IS_MOCK_DATA && (
        <p className="mb-4 flex items-start gap-2 rounded-control bg-dev-soft p-3 text-xs font-medium text-dev">
          <FlaskConical className="mt-px size-4 shrink-0" aria-hidden />
          {t('acquire.devNotice')}
        </p>
      )}
      <div className="mb-5 space-y-3">
        <Segmented<TxFilter>
          label={t('acquire.transactionLabel')}
          value={tx}
          onChange={(v) => set('transaction', v)}
          options={(['all', 'sale', 'rent'] as const).map((v) => ({ value: v, label: t(`acquire.filters.${v}`) }))}
        />
        <Segmented<KindFilter>
          label={t('acquire.kindLabel')}
          value={kind}
          onChange={(v) => set('type', v)}
          options={(['all', 'apartment', 'house'] as const).map((v) => ({ value: v, label: t(`acquire.filters.${v}`) }))}
        />
      </div>
      <AsyncBoundary
        state={state}
        skeleton={
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-card" />
            ))}
          </div>
        }
      >
        {(listings) =>
          listings.length ? (
            <div
              className={cn('grid gap-4 transition-opacity sm:grid-cols-2', state.loading && 'opacity-50')}
              aria-busy={state.loading || undefined}
            >
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState icon={<SearchX />} title={t('acquire.emptyTitle')} body={t('acquire.emptyBody')} />
            </Card>
          )
        }
      </AsyncBoundary>
    </>
  )
}
