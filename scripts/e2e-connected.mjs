/**
 * Cross-app end-to-end test: resident app ⇄ Supabase ⇄ agency dashboard.
 *
 * Needs the local Supabase stack and both apps running against it:
 *   npx supabase start && npx supabase db reset
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npx vite --port 5174
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run dev:dashboard -- --port 5180
 *   node scripts/e2e-connected.mjs
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const APP = process.env.APP_URL ?? 'http://localhost:5174'
const DASH = process.env.DASH_URL ?? 'http://localhost:5180'
const SHOTS = process.env.SHOTS ?? 'test-results/connected'
mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const agencyCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
const residentCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR' })
const agency = await agencyCtx.newPage()
const resident = await residentCtx.newPage()
const errors = []
for (const [name, p] of [['agency', agency], ['resident', resident]]) {
  p.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && errors.push(`${name} console: ${m.text()}`))
}

let n = 0
async function check(name, fn) {
  n++
  try {
    await fn()
    console.log(`✓ ${String(n).padStart(2)} ${name}`)
  } catch (e) {
    console.error(`✗ ${String(n).padStart(2)} ${name}\n   ${e.message.split('\n')[0]}`)
    await agency.screenshot({ path: join(SHOTS, `FAIL-${n}-agency.png`), fullPage: true })
    await resident.screenshot({ path: join(SHOTS, `FAIL-${n}-resident.png`), fullPage: true })
    if (errors.length) console.error(errors.join('\n'))
    await browser.close()
    process.exit(1)
  }
}
const shot = (p, name) => p.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
const LIVE = { timeout: 20000 }
const stamp = Date.now().toString(36)

let unitCode = ''

await check('agency: first sign-up waits for approval, then becomes admin', async () => {
  await agency.goto(DASH + '/')
  await agency.waitForURL(/connexion/)
  await agency.getByRole('button', { name: 'Demander un accès' }).click()
  await agency.getByLabel('Nom complet').fill('Nadia Directrice')
  await agency.getByLabel('E-mail professionnel').fill(`direction-${stamp}@example.com`)
  await agency.getByLabel('Mot de passe').fill('Test-password-123')
  await agency.getByRole('button', { name: 'Créer le compte' }).click()
  await agency.getByRole('heading', { name: 'Compte en attente de validation' }).waitFor()
  await shot(agency, '01-pending')
  await agency.getByRole('button', { name: /devenir administrateur/ }).click()
  await agency.getByRole('heading', { name: 'Vue d’ensemble' }).waitFor()
  await agency.getByText('En direct', { exact: true }).filter({ visible: true }).waitFor(LIVE)
})

await check('agency: adds an apartment and gets its access code', async () => {
  await agency.getByRole('link', { name: 'Immeubles' }).click()
  await agency.getByRole('link', { name: /Résidence El Bahia/ }).click()
  await agency.getByText('BAHIA12A').waitFor()
  const section = agency.getByRole('region', { name: 'Bâtiment A' })
  await section.getByLabel('N° appt').fill('15')
  await section.getByLabel('Étage').fill('3')
  await section.getByLabel('Surface m²').fill('78')
  await section.getByLabel('Pièces').fill('3')
  await section.getByRole('button', { name: 'Ajouter' }).click()
  const row = section.locator('tr', { hasText: 'Appt 15' })
  await row.waitFor()
  unitCode = (await row.locator('.font-mono').innerText()).trim()
  if (!/^[A-Z0-9]{8}$/.test(unitCode)) throw new Error(`bad code ${unitCode}`)
  await shot(agency, '02-residence')
})

await check('resident: signs up with the code and sees the apartment', async () => {
  await resident.goto(APP + '/')
  await resident.waitForURL(/bienvenue/)
  await resident.getByRole('button', { name: 'Passer', exact: true }).click()
  await resident.getByRole('button', { name: 'Créer un compte' }).click()
  await resident.getByLabel('Nom complet').fill('Karima Résidente')
  await resident.getByLabel('E-mail').fill(`karima-${stamp}@example.com`)
  await resident.getByLabel('Mot de passe').fill('Test-password-123')
  await resident.getByLabel(/Téléphone/).fill('+213 5 55 00 00 01')
  await resident.getByLabel(/Code logement/).fill(unitCode)
  await resident.getByRole('button', { name: 'Créer un compte' }).click()
  await resident.getByRole('heading', { name: 'Bonjour Karima' }).waitFor()
  await resident.getByText(/Bâtiment A · Étage 3 · Appt 15/).first().waitFor()
})

await check('agency: sees the resident linked to the apartment', async () => {
  await agency.reload()
  await agency.getByRole('region', { name: 'Bâtiment A' }).locator('tr', { hasText: 'Appt 15' }).getByText('Karima Résidente').waitFor()
})

await check('resident: files an urgent report with a photo', async () => {
  await agency.getByRole('link', { name: 'Vue d’ensemble' }).click()
  await agency.getByText('En direct', { exact: true }).filter({ visible: true }).waitFor(LIVE)
  await agency.waitForTimeout(3000) // realtime streams a moment after subscribing
  await resident.getByRole('link', { name: /Signaler un problème/ }).first().click()
  await resident.getByText('Fuite d’eau', { exact: true }).click()
  await resident.getByRole('button', { name: 'Suivant' }).click()
  await resident.getByLabel('Titre').fill('Fuite au plafond de la cuisine')
  await resident.getByLabel('Description').fill('De l’eau coule du plafond de la cuisine depuis ce matin, au-dessus du plan de travail.')
  await resident.getByText('Cuisine', { exact: true }).click()
  const png = await resident.screenshot({ clip: { x: 0, y: 0, width: 240, height: 180 } })
  await resident.getByTestId('photo-input').setInputFiles({ name: 'plafond.png', mimeType: 'image/png', buffer: png })
  await resident.getByRole('img', { name: 'plafond.png' }).waitFor()
  await resident.getByText('Urgent', { exact: true }).click()
  await resident.getByRole('button', { name: 'Suivant' }).click()
  await resident.getByRole('button', { name: 'Envoyer le signalement' }).click()
  await resident.getByText(/#SR-\d{4}-\d{4}/).waitFor()
})

await check('agency: live alert arrives without reloading', async () => {
  const toast = agency.getByRole('alert').filter({ hasText: 'Fuite au plafond de la cuisine' })
  await toast.waitFor(LIVE)
  await toast.getByText('Nouveau signalement').waitFor()
  await shot(agency, '03-live-alert')
  await toast.getByRole('link', { name: 'Ouvrir' }).click()
  await agency.getByRole('heading', { name: 'Fuite au plafond de la cuisine' }).waitFor()
  await agency.getByRole('button', { name: 'plafond.png' }).waitFor()
  await agency.getByText('Karima Résidente').first().waitFor()
})

await check('agency: takes it on, dispatches a plumber, asks a question', async () => {
  await agency.getByRole('button', { name: 'Prendre en charge' }).click()
  await agency.getByText('Statut : En cours d’examen').waitFor()
  await agency.getByLabel('Technicien').selectOption({ label: 'Karim Belkacem — Plomberie Express (Fuite d’eau)' }).catch(async () => {
    const opts = await agency.getByLabel('Technicien').locator('option').allInnerTexts()
    const karim = opts.find((o) => o.startsWith('Karim'))
    await agency.getByLabel('Technicien').selectOption({ label: karim })
  })
  await agency.getByRole('button', { name: 'Planifier et notifier' }).click()
  await agency.getByText('Intervention planifiée — le résident est notifié').waitFor()
  await agency.getByLabel('Question').fill('Pouvez-vous nous dire si l’eau coule encore ?')
  await agency.getByRole('button', { name: 'Envoyer la demande' }).click()
  await agency.getByText('Demande envoyée au résident').waitFor()
  await shot(agency, '04-report-detail')
})

await check('resident: sees the appointment and the question live', async () => {
  await resident.getByRole('link', { name: 'Voir mon signalement' }).click()
  await resident.getByText('L’agence a besoin d’informations').waitFor(LIVE)
  await resident.getByText(/Technicien\s:\sKarim Belkacem/).waitFor()
  await resident.getByText(/Rendez-vous\s:/).waitFor()
  await resident.getByText('Pouvez-vous nous dire si l’eau coule encore ?').waitFor()
  await shot(resident, '05-resident-detail')
})

await check('resident replies → agency alerted and sees the message', async () => {
  await resident.getByLabel('Votre message').fill('Oui, ça coule encore goutte à goutte.')
  await resident.getByRole('button', { name: 'Envoyer', exact: true }).click()
  await resident.getByText('Message enregistré').waitFor()
  await agency.getByRole('alert').filter({ hasText: 'Réponse d’un résident' }).waitFor(LIVE)
  await agency.getByText('Oui, ça coule encore goutte à goutte.').waitFor(LIVE)
})

await check('agency resolves → resident confirms and rates → agency sees the rating', async () => {
  await agency.getByRole('button', { name: 'Passer en traitement' }).click()
  await agency.getByText('Statut : En cours de traitement').waitFor()
  await agency.getByRole('button', { name: 'Marquer comme résolu' }).click()
  await agency.getByText('Statut : Résolu').waitFor()
  await resident.getByRole('heading', { name: 'Le problème est-il réglé ?' }).waitFor(LIVE)
  await resident.getByRole('button', { name: 'Oui, c’est réglé' }).click()
  await resident.getByRole('radio', { name: /5 sur 5/ }).check({ force: true })
  await resident.getByRole('button', { name: 'Envoyer mon avis' }).click()
  await resident.getByText('Merci pour votre retour').waitFor()
  await agency.getByRole('alert').filter({ hasText: 'Nouvel avis' }).waitFor(LIVE)
  await agency.getByText('Avis du résident : 5 / 5').waitFor(LIVE)
})

await check('resident got notifications for each agency step', async () => {
  await resident.goto(APP + '/notifications')
  for (const text of ['intervention planifiée', 'demande des informations', 'Résolu']) await resident.getByText(new RegExp(text)).first().waitFor()
  await shot(resident, '06-resident-notifications')
})

await check('agency publishes an announcement → resident receives it', async () => {
  await agency.getByRole('link', { name: 'Annonces' }).click()
  await agency.getByLabel('Résidence').selectOption({ label: 'Résidence El Bahia' })
  await agency.getByLabel('Titre (français)').fill(`Nettoyage des caves ${stamp}`)
  await agency.getByLabel('Texte (français)').fill('Merci de libérer les caves avant vendredi.')
  await agency.getByLabel('العنوان (بالعربية)').fill('تنظيف الأقبية')
  await agency.getByLabel('النص (بالعربية)').fill('يرجى إخلاء الأقبية قبل يوم الجمعة.')
  await agency.getByRole('button', { name: 'Publier et notifier les résidents' }).click()
  await agency.getByText('Annonce publiée').waitFor()
  await resident.goto(APP + '/')
  await resident.getByText(`Nettoyage des caves ${stamp}`).waitFor(LIVE)
})

await check('dashboard overview and dispatch board render', async () => {
  await agency.getByRole('link', { name: 'Vue d’ensemble' }).click()
  await agency.getByText('Satisfaction (30 j)').waitFor()
  await shot(agency, '07-overview')
  await agency.getByRole('link', { name: 'Interventions', exact: true }).click()
  await agency.getByText('Planning par technicien').waitFor()
  await shot(agency, '08-dispatch')
})

await browser.close()
const real = errors.filter((e) => !/Failed to load resource.*(400|401|404)/.test(e))
if (real.length) {
  console.error('\nBrowser errors:\n' + real.join('\n'))
  process.exit(1)
}
console.log(`\nAll ${n} connected checks passed. Screenshots in ${SHOTS}`)
