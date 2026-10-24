/**
 * End-to-end smoke test of the core resident journey (FR + AR).
 *
 * Usage:  npm run dev   (in another terminal)
 *         npm run e2e   [BASE_URL=http://localhost:5173] [CHROMIUM_PATH=/path/to/chrome] [SHOTS=dir]
 *
 * Uses playwright-core with an existing Chromium (no browser download).
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const SHOTS = process.env.SHOTS ?? 'test-results/screens'
mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: 'fr-FR' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))

let step = 0
async function check(name, fn) {
  step++
  try {
    await fn()
    console.log(`✓ ${String(step).padStart(2)} ${name}`)
  } catch (e) {
    console.error(`✗ ${String(step).padStart(2)} ${name}\n   ${e.message.split('\n')[0]}`)
    await page.screenshot({ path: join(SHOTS, `FAIL-${step}.png`), fullPage: true })
    await browser.close()
    process.exit(1)
  }
}
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
const expectText = async (text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 })
async function noHorizontalOverflow() {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  if (sw > iw + 1) {
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1)
        .slice(0, 5)
        .map((e) => `${e.tagName}.${String(e.className).slice(0, 80)}`),
    )
    throw new Error(`horizontal overflow: scrollWidth ${sw} > ${iw} on ${page.url()} — ${offenders.join(' | ')}`)
  }
}
const reportCount = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('immo-agency.dev.db.v2') ?? '{"reports":[]}').reports.filter((r) => r.createdLocally).length)

// Start from a clean slate.
await page.goto(BASE)
await page.evaluate(() => {
  localStorage.clear()
  sessionStorage.clear()
})

await check('first launch shows onboarding (swipe-free: buttons, Arabic, skip-less finish)', async () => {
  await page.goto(BASE + '/')
  await page.waitForURL(/\/bienvenue/)
  await page.getByRole('heading', { name: 'Bienvenue sur IMMO Agency' }).waitFor()
  await noHorizontalOverflow()
  await shot('00a-onboarding-1')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('heading', { name: 'Signalez un problème en quelques étapes' }).waitFor()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('heading', { name: 'Suivez chaque étape' }).waitFor()
  await shot('00b-onboarding-3')
  await page.getByRole('button', { name: /Passer en/ }).click()
  await page.getByRole('heading', { name: 'تابع كل مرحلة' }).waitFor()
  await noHorizontalOverflow()
  await shot('00c-onboarding-ar')
  await page.getByRole('button', { name: /التبديل إلى/ }).click()
  await page.getByRole('button', { name: 'Aller à l’écran 4' }).click()
  await page.getByRole('heading', { name: 'Restez informé·e' }).waitFor()
  await page.getByRole('button', { name: 'Commencer' }).click()
})

await check('unauthenticated visit redirects to demo sign-in', async () => {
  await page.waitForURL(/\/connexion/)
  await page.goto(BASE + '/')
  await page.waitForURL(/\/connexion/) // onboarding is not shown twice
  await shot('00-signin')
  await page.getByRole('button', { name: 'Continuer avec le compte de démonstration' }).click()
  await page.waitForURL(BASE + '/')
})

await check('home shows greeting, CTA, active reports, announcements', async () => {
  await page.getByRole('heading', { name: 'Bonjour Amine' }).waitFor()
  await expectText('Signaler un problème')
  await expectText('Coupure d’eau programmée')
  await expectText('Action requise')
  await noHorizontalOverflow()
  await shot('01-home-fr')
})

await check('open a property', async () => {
  await page.getByRole('link', { name: /^Résidence El Bahia/ }).first().click()
  await page.waitForURL(/\/biens\/prop-bahia-a12/)
  await page.getByRole('heading', { name: 'Résidence El Bahia' }).waitFor()
  await noHorizontalOverflow()
  await shot('02-property-detail')
})

const before = await reportCount()

await check('start a report from the property (property preselected → category step)', async () => {
  await page.getByRole('link', { name: 'Signaler un problème ici' }).click()
  await page.waitForURL(/\/signaler\?bien=prop-bahia-a12/)
  await page.getByText('Quelle est la catégorie du problème ?').waitFor()
  await expectText('Étape 2 sur 4')
})

await check('category is required, then select Plomberie', async () => {
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expectText('Choisissez une catégorie.')
  await shot('03-category-error')
  await page.getByText('Plomberie', { exact: true }).click()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByText('Décrivez le problème').first().waitFor()
})

await check('details validation, then fill title/description/location/photo/urgency', async () => {
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expectText('Indiquez un titre.')
  await expectText('Décrivez le problème.')
  await expectText('Indiquez où se situe le problème.')
  await page.getByLabel('Titre').fill('Robinet de cuisine qui fuit')
  await page.getByLabel('Description').fill('Le robinet de la cuisine fuit en continu depuis ce matin, une flaque se forme.')
  await page.getByText('Cuisine', { exact: true }).click()
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 200 } })
  await page.getByTestId('photo-input').setInputFiles({ name: 'fuite.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('img', { name: 'fuite.png' }).waitFor()
  await page.getByText('Urgent', { exact: true }).click()
  await expectText('ne garantit pas un délai')
  await shot('04-details-filled')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByText('Vérifiez avant d’envoyer').waitFor()
})

await check('review shows summary; switching to Arabic keeps the form', async () => {
  await expectText('Robinet de cuisine qui fuit')
  await shot('05-review-fr')
  await page.getByRole('button', { name: /Passer en/ }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'rtl')
  await page.getByText('راجع قبل الإرسال').waitFor()
  await expectText('Robinet de cuisine qui fuit')
  await noHorizontalOverflow()
  await shot('06-review-ar')
  await page.getByRole('button', { name: /التبديل إلى/ }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'ltr')
})

await check('back navigation keeps entered data', async () => {
  await page.getByRole('button', { name: 'Modifier — Catégorie' }).click()
  await page.getByText('Quelle est la catégorie du problème ?').waitFor()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByLabel('Titre').waitFor()
  if ((await page.getByLabel('Titre').inputValue()) !== 'Robinet de cuisine qui fuit') throw new Error('title lost')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByText('Vérifiez avant d’envoyer').waitFor()
})

await check('failed submission keeps data and offers retry (draft survives navigation)', async () => {
  await page.goto(BASE + '/dev')
  await page.getByText('Échec du prochain envoi').click()
  await page.goto(BASE + '/signaler')
  await page.getByText('Vérifiez avant d’envoyer').waitFor()
  await page.getByRole('button', { name: 'Envoyer le signalement' }).click()
  await expectText('L’envoi a échoué')
  await shot('07-submit-failed')
  if ((await reportCount()) !== before) throw new Error('failed submit created a report')
})

await check('retry submits exactly once even with repeated clicks', async () => {
  const btn = page.getByRole('button', { name: 'Envoyer le signalement' })
  await btn.click({ clickCount: 3, delay: 10 })
  await page.waitForURL(/\/signaler\/confirmation\//)
  await page.getByText('Signalement enregistré').waitFor()
  const after = await reportCount()
  if (after !== before + 1) throw new Error(`expected ${before + 1} reports, got ${after}`)
})

await check('confirmation shows dev reference and initial status', async () => {
  await page.getByText(/#DEV-\d{4}-\d{4}/).waitFor()
  await expectText('Soumis')
  await expectText('n’a pas été transmis à l’agence')
  await shot('08-confirmation')
  await page.getByRole('link', { name: 'Voir mon signalement' }).click()
  await page.waitForURL(/\/signalements\/[0-9a-f-]{36}$/)
})

await check('report detail shows timeline and photo', async () => {
  await page.getByRole('heading', { name: 'Robinet de cuisine qui fuit' }).waitFor()
  await page.getByRole('heading', { name: 'Suivi' }).waitFor()
  await page.getByRole('button', { name: 'fuite.png' }).waitFor()
  await noHorizontalOverflow()
})

await check('simulated agency updates appear in timeline, labelled as simulated', async () => {
  await page.getByRole('button', { name: 'Passer à « En cours d’examen »' }).click()
  await page.getByText('Simulé').first().waitFor()
  await page.getByRole('button', { name: 'Demander des informations' }).click()
  await expectText('L’agence a besoin d’informations')
  await shot('09-detail-simulated')
})

await check('resident replies to the info request', async () => {
  await page.getByLabel('Votre message').fill('Le robinet se trouve à gauche de l’évier.')
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
  await expectText('Message enregistré')
  await page.locator('ol li', { hasText: 'Le robinet se trouve à gauche' }).first().waitFor()
})

await check('resident says the fix did not work → report reopened', async () => {
  await page.getByRole('button', { name: 'Passer à « En cours de traitement »' }).click()
  await page.getByRole('button', { name: 'Passer à « Résolu »' }).click()
  await page.getByRole('heading', { name: 'Le problème est-il réglé\u00a0?' }).waitFor()
  await shot('09b-feedback-question')
  await page.getByRole('button', { name: 'Non, le problème persiste' }).click()
  await page.getByRole('button', { name: 'Relancer le signalement' }).click()
  await expectText('5 caractères minimum')
  await page.getByLabel('Qu’est-ce qui ne va toujours pas\u00a0?').fill('Le robinet goutte encore la nuit.')
  await page.getByRole('button', { name: 'Relancer le signalement' }).click()
  await expectText('Signalement relancé')
  await page.getByText('Le résident signale que le problème persiste').waitFor()
  await page.getByText('En cours de traitement').first().waitFor()
})

await check('resident confirms a resolved report and rates it', async () => {
  await page.goto(BASE + '/')
  await page.getByText('Confirmez la résolution').waitFor()
  await page.getByRole('link', { name: /Ascenseur bloqué au 3e étage/ }).first().click()
  await page.getByRole('button', { name: 'Oui, c’est réglé' }).click()
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click()
  await expectText('Choisissez une note.')
  await page.getByRole('radio', { name: /4 sur 5/ }).check({ force: true })
  await page.getByLabel(/Commentaire/).fill('Intervention rapide, merci.')
  await shot('09c-feedback-rating')
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click()
  await page.getByText('Merci pour votre retour').waitFor()
  await expectText('4 sur 5 — Satisfait')
  await page.reload()
  await page.getByText('Merci pour votre retour').waitFor()
})

await check('emergency page: national numbers, residence lines, tips → prefilled report', async () => {
  await page.goto(BASE + '/')
  await page.getByRole('link', { name: 'Urgences' }).first().click()
  await page.waitForURL(/\/urgences/)
  const href = await page.getByRole('link', { name: /Protection civile/ }).getAttribute('href')
  if (href !== 'tel:14') throw new Error(`unexpected tel link ${href}`)
  await expectText('Astreinte de l’agence')
  await page.getByText('Odeur de gaz').click()
  await expectText('N’actionnez aucun interrupteur')
  await noHorizontalOverflow()
  await shot('09d-emergency')
  await page.getByText('Fuite d’eau importante').click()
  await page.getByRole('link', { name: 'Signaler à l’agence' }).nth(1).click()
  await page.waitForURL(/categorie=water_leak/)
  await page.getByText('Résidence El Bahia').first().click()
  await page.getByRole('button', { name: 'Suivant' }).click()
  if (!(await page.getByRole('radio', { name: /Fuite d’eau/ }).isChecked())) throw new Error('category not prefilled')
  await page.getByRole('button', { name: 'Annuler' }).first().click()
  await page.getByRole('button', { name: 'Abandonner' }).click()
})

await check('notifications list the new events', async () => {
  await page.goto(BASE + '/notifications')
  await expectText('L’agence demande des informations')
  await expectText('a été enregistré')
  await shot('10-notifications')
})

await check('reports list + filters', async () => {
  await page.goto(BASE + '/signalements')
  await expectText('Robinet de cuisine qui fuit')
  await page.locator('label', { hasText: 'Terminés' }).click()
  await page.waitForURL(/statut=done/)
  await expectText('Climatisation du salon bruyante')
  await shot('11-reports-done')
  await page.locator('label', { hasText: 'Tous' }).first().click()
})

await check('refresh keeps persisted data and current page', async () => {
  await page.goto(BASE + '/signalements?statut=open')
  await page.reload()
  await expectText('Robinet de cuisine qui fuit')
  if (!page.url().includes('statut=open')) throw new Error('filter lost on refresh')
})

await check('profile: switch to Arabic, verify RTL', async () => {
  await page.goto(BASE + '/profil')
  await page.getByRole('radio', { name: 'العربية' }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar')
  await page.getByRole('heading', { name: 'الملف الشخصي' }).waitFor()
  await noHorizontalOverflow()
  await shot('12-profile-ar')
})

await check('Arabic home / reports / detail render RTL without overflow', async () => {
  await page.goto(BASE + '/')
  await page.getByRole('heading', { name: /مرحباً\s*\u2068?Amine/ }).waitFor()
  const navX = await page.getByRole('link', { name: 'الرئيسية' }).last().boundingBox()
  const profX = await page.getByRole('link', { name: 'الملف الشخصي' }).last().boundingBox()
  if (!(navX && profX && navX.x > profX.x)) throw new Error('bottom nav not mirrored in RTL')
  await noHorizontalOverflow()
  await shot('13-home-ar')
  await page.goto(BASE + '/signalements')
  await page.getByRole('heading', { name: 'بلاغاتي' }).waitFor()
  await noHorizontalOverflow()
  await shot('14-reports-ar')
  await page.goto(BASE + '/signalements/rep-0147')
  await expectText('المتابعة')
  await noHorizontalOverflow()
  await shot('15-detail-ar')
  await page.goto(BASE + '/signaler')
  await expectText('ما المسكن المعني؟')
  await noHorizontalOverflow()
  await shot('16-new-report-ar')
})

await check('language persists across refresh', async () => {
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dir === 'rtl')
  await page.goto(BASE + '/profil')
  await page.getByRole('radio', { name: 'Français' }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'ltr')
})

await check('acquisition: browse, filter, open listing, interest form validation + success', async () => {
  await page.goto(BASE + '/')
  await page.getByRole('link', { name: /Envie d’un nouveau chez-vous/ }).click()
  await page.waitForURL(/\/acquerir/)
  await expectText('Annonces fictives')
  await shot('17-acquire')
  await page.getByText('Location', { exact: true }).click()
  await expectText('Studio meublé à louer')
  await page.getByText('Studio meublé à louer').click()
  await page.waitForURL(/\/acquerir\/lst-studio/)
  await page.getByRole('button', { name: 'Envoyer la demande' }).click()
  await expectText('Indiquez votre nom.')
  await expectText('Numéro de téléphone invalide.')
  await page.getByLabel('Nom complet').fill('Amine El Fassi')
  await page.getByRole('textbox', { name: 'Téléphone' }).fill('+213 5 00 00 00 00')
  await page.getByRole('button', { name: 'Envoyer la demande' }).click()
  await expectText('Demande enregistrée')
  await shot('18-listing-success')
})

await check('preferences persist across refresh', async () => {
  await page.goto(BASE + '/profil')
  const sw = page.getByRole('switch', { name: /Nouveaux biens disponibles/ })
  await sw.waitFor()
  if ((await sw.getAttribute('aria-checked')) !== 'false') throw new Error('unexpected default')
  await sw.click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('immo-agency.dev.db.v2')).preferences.listings === true)
  await page.reload()
  await page.getByRole('switch', { name: /Nouveaux biens disponibles/, checked: true }).waitFor()
})

await check('network failure shows error state with retry', async () => {
  await page.goto(BASE + '/dev')
  await page.getByText('Toutes les requêtes échouent').click()
  await page.goto(BASE + '/biens')
  await expectText('Connexion impossible')
  await shot('19-error-state')
  await page.goto(BASE + '/dev')
  await page.getByText('Désactivée', { exact: true }).click()
  await page.goto(BASE + '/biens')
  await expectText('Les Jardins d’Oran')
})

await check('empty dataset shows empty states', async () => {
  await page.goto(BASE + '/dev')
  await page.getByRole('button', { name: 'Réinitialiser' }).nth(1).click()
  await expectText('Données réinitialisées')
  await page.goto(BASE + '/')
  await expectText('Aucun bien associé')
  await expectText('Aucun signalement en cours')
  await shot('20-home-empty')
  await page.goto(BASE + '/signalements')
  await expectText('Aucun signalement')
  await page.goto(BASE + '/notifications')
  await expectText('Aucune notification')
  await page.goto(BASE + '/signaler')
  await expectText('Aucun bien à associer')
  await page.goto(BASE + '/dev')
  await page.getByRole('button', { name: 'Réinitialiser' }).first().click()
  await expectText('Données réinitialisées')
})

await check('cancel flow asks for confirmation', async () => {
  await page.goto(BASE + '/signaler')
  await page.getByText('Résidence El Bahia').first().click()
  await page.getByRole('button', { name: 'Annuler' }).first().click()
  await page.getByText('Abandonner ce signalement ?').waitFor()
  await page.getByRole('button', { name: 'Abandonner' }).click()
  await page.waitForURL(BASE + '/')
})

await check('small screen (320px) layouts do not overflow', async () => {
  await page.setViewportSize({ width: 320, height: 640 })
  for (const path of ['/', '/biens', '/biens/prop-bahia-a12', '/signalements', '/signalements/rep-0139', '/signaler', '/acquerir', '/profil', '/notifications', '/urgences', '/bienvenue']) {
    await page.goto(BASE + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
    await noHorizontalOverflow()
  }
  await shot('21-small-detail')
})

await check('desktop layout uses sidebar navigation', async () => {
  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto(BASE + '/')
  await page.getByRole('complementary').getByRole('link', { name: 'Signalements' }).waitFor()
  await page.waitForTimeout(800)
  await shot('22-desktop-home')
  await page.goto(BASE + '/signalements/rep-0147')
  await page.waitForTimeout(800)
  await shot('23-desktop-detail')
})

await check('sign out returns to sign-in and protects routes', async () => {
  await page.goto(BASE + '/profil')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Se déconnecter' }).click()
  await page.waitForURL(/\/connexion/)
  await page.goto(BASE + '/signalements')
  await page.waitForURL(/\/connexion/)
})

await browser.close()
if (errors.length) {
  console.error('\nBrowser errors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`\nAll ${step} checks passed. Screenshots in ${SHOTS}`)
