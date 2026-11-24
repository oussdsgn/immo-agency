/**
 * CSV export of reports for the agency's reporting (opens in Excel / Google
 * Sheets: UTF-8 with BOM, `;` separator as French Excel expects).
 */
import { collection, getDocs } from 'firebase/firestore'
import { iso, type EventDoc } from '@/services/firebase/schema'
import { db } from './firebase'
import type { ReportListItem } from './data'

type Translate = (key: string) => string

/** First time each report reached "resolved", from its timeline. */
async function resolvedAt(reports: ReportListItem[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const todo = reports.filter((r) => ['resolved', 'closed'].includes(r.status))
  // A few requests at a time: enough for hundreds of reports, gentle on quotas.
  for (let i = 0; i < todo.length; i += 10) {
    await Promise.all(
      todo.slice(i, i + 10).map(async (r) => {
        const snap = await getDocs(collection(db, 'reports', r.id, 'events'))
        const times = snap.docs
          .map((d) => d.data() as EventDoc)
          .filter((e) => e.status === 'resolved')
          .map((e) => iso(e.at))
          .sort()
        if (times[0]) out.set(r.id, times[0])
      }),
    )
  }
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')
function date(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Quotes a cell; neutralises values a spreadsheet would run as a formula. */
export function cell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function reportsCsv(reports: ReportListItem[], t: Translate): Promise<string> {
  const resolved = await resolvedAt(reports)
  const header = [
    'Référence',
    'Reçu le',
    'Résidence',
    'Bâtiment',
    'Logement',
    'Catégorie',
    'Titre',
    'Urgence',
    'Statut',
    'Technicien',
    'Rendez-vous',
    'Résident',
    'Téléphone',
    'E-mail',
    'Résolu le',
    'Délai de résolution (heures)',
    'Note du résident (/5)',
    'Dernière mise à jour',
  ]
  const rows = reports.map((r) => {
    const done = resolved.get(r.id)
    const hours = done ? Math.round(((new Date(done).getTime() - new Date(r.created_at).getTime()) / 3_600_000) * 10) / 10 : null
    return [
      r.reference,
      date(r.created_at),
      r.unit?.building?.residence?.name,
      r.unit?.building?.name,
      r.unit?.number,
      t(`categories.${r.category}.name`),
      r.title,
      t(`urgency.${r.urgency}`),
      t(`status.${r.status}`),
      r.technician?.name,
      date(r.scheduled_at),
      r.resident?.full_name,
      r.resident?.phone,
      r.resident?.email,
      date(done),
      hours === null ? '' : String(hours).replace('.', ','),
      r.feedback_rating,
      date(r.updated_at),
    ]
  })
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n'
}

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
