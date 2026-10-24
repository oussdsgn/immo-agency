# Mise en service : Supabase + tableau de bord agence

Ce guide connecte l’application des résidents (APK Android) et le tableau de bord de l’agence à **votre** projet Supabase. Comptez environ 15 minutes. Vous n’aurez à le faire qu’une fois.

```
Téléphones des résidents ──►  Supabase  ◄── Tableau de bord (navigateur)
   (APK IMMO Agency)        base de données,      https://<compte>.github.io/immo-agency/
                            comptes, photos,
                            temps réel
```

## 1. Créer le projet Supabase

1. Créez un compte sur [supabase.com](https://supabase.com), puis cliquez sur **New project**.
2. Choisissez une région proche de vos utilisateurs (par exemple *Central EU (Frankfurt)* ou *West EU (Paris)*).
3. Choisissez un **mot de passe de base de données** solide et gardez-le pour vous. Il n’est jamais nécessaire dans l’application.

## 2. Créer les tables et les règles d’accès

1. Dans le projet, ouvrez **SQL Editor** puis **New query**.
2. Copiez tout le contenu de [`supabase/migrations/20261024000000_init.sql`](../supabase/migrations/20261024000000_init.sql), collez-le, puis cliquez sur **Run**. Le message attendu est « Success. No rows returned ».
3. *(Facultatif)* Pour démarrer avec des résidences, techniciens et annonces d’exemple fictifs, exécutez de la même manière [`supabase/seed.sql`](../supabase/seed.sql). Sinon, vous créerez vos propres immeubles depuis le tableau de bord.

## 3. Réglages de connexion (Authentication)

1. Ouvrez **Authentication → URL Configuration**.
   - **Site URL** : `https://<votre-compte>.github.io/immo-agency/`
   - **Redirect URLs** : ajoutez la même adresse.
2. Ouvrez **Authentication → Sign In / Providers → Email**.
   - **Confirm email** activé (recommandé) : chaque nouvel utilisateur clique sur le lien reçu par e-mail avant sa première connexion.
   - Le service d’e-mail intégré à Supabase n’envoie que quelques e-mails par heure. C’est suffisant pour un pilote ; en production, configurez votre propre SMTP (**Authentication → Emails → SMTP Settings**).
   - Pour un test rapide entre collègues, vous pouvez désactiver **Confirm email**.

## 4. Récupérer les clés publiques

Ouvrez **Project Settings → API** (ou **Data API / API Keys**) et notez :

- **Project URL**, par exemple `https://abcdefgh.supabase.co`
- la clé **anon public** (ou **publishable**, qui commence par `sb_publishable_`).

Ces deux valeurs sont **publiques par conception**. Elles sont intégrées à l’APK et au tableau de bord, et la protection des données est assurée par les règles de la base (étape 2).

> ⚠️ N’utilisez **jamais** la clé `service_role` / `secret` dans l’application, et ne la partagez avec personne : elle contourne toutes les règles d’accès.

## 5. Brancher GitHub

Dans le dépôt GitHub, faites ces deux réglages :

1. **Settings → Secrets and variables → Actions → onglet Variables → New repository variable**, à faire deux fois :
   - `VITE_SUPABASE_URL` = l’URL du projet
   - `VITE_SUPABASE_ANON_KEY` = la clé anon / publishable
2. **Settings → Pages → Build and deployment → Source : GitHub Actions**.

Ensuite, dans **Actions**, relancez les deux workflows sur `main` : **Run workflow** sur « Dashboard (GitHub Pages) » puis sur « Android APK ». Un simple push sur `main` les relance aussi.

- Le tableau de bord est en ligne à `https://<votre-compte>.github.io/immo-agency/`.
- Le nouvel APK, désormais connecté, se télécharge au même lien qu’avant : `…/releases/latest/download/IMMO-Agency.apk`.

## 6. Premier démarrage

1. Ouvrez le tableau de bord, cliquez sur **Demander un accès** et créez votre compte.
2. Sur l’écran « Compte en attente », cliquez sur **Première installation : devenir administrateur**. Cela ne fonctionne que tant qu’aucun administrateur n’existe.
3. Pour vos collègues : ils demandent un accès de la même façon, puis vous les validez dans **Équipe**.
4. Dans **Immeubles**, créez une résidence, ses bâtiments et ses logements. Chaque logement reçoit un **code d’accès** à 8 caractères.
5. Bouton **Copier l’invitation** : le texte copié contient le lien de l’APK et le code du logement. Envoyez-le au résident par SMS ou WhatsApp.
6. Le résident installe l’application, choisit **Créer un compte** et saisit le code. Son logement apparaît immédiatement.
7. Ajoutez vos techniciens dans **Techniciens**. Les nouveaux signalements arrivent alors en direct dans le tableau de bord.

## Développement local (facultatif)

Prérequis : Docker.

```bash
npx supabase start          # base locale + auth + stockage + temps réel
npx supabase db reset       # applique le schéma et les données d’exemple
npm run test:db             # 55 vérifications de sécurité et de workflow

# Les URL et clés locales s’affichent avec : npx supabase status
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<anon locale> npm run dev            # application
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<anon locale> npm run dev:dashboard  # tableau de bord
node scripts/e2e-connected.mjs                                                                      # test croisé app ⇄ tableau de bord
```

Pour les données de démonstration en local, les codes logement sont `BAHIA12A`, `BAHIA14A`, `BAHIA21B` et `JARDIN4C`.
