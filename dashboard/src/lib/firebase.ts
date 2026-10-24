import { firebase } from '@/services/firebase/client'
import { OpError } from '@/services/firebase/ops'

export type { ReportStatus } from '@/types'
export type { StaffRole } from '@/services/firebase/schema'

export const { auth, db } = firebase()

/** Readable French message for a failed request. */
export function errorMessage(err: unknown): string {
  if (err instanceof OpError) {
    return {
      not_allowed: 'Ce changement de statut n’est pas autorisé à cette étape.',
      not_found: 'Élément introuvable.',
      invalid_code: 'Code invalide.',
      invalid: 'Certaines valeurs sont invalides.',
    }[err.code]
  }
  const code = (err as { code?: string })?.code ?? ''
  const msg = (err as { message?: string })?.message ?? String(err)
  if (code === 'unavailable' || code === 'auth/network-request-failed' || /network|offline/i.test(msg)) {
    return 'Connexion impossible. Vérifiez le réseau et réessayez.'
  }
  if (code === 'permission-denied') return 'Action non autorisée pour votre compte (ou valeurs invalides).'
  if (code === 'not-found') return 'Élément introuvable.'
  return msg || 'Une erreur est survenue.'
}
