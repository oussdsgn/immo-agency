# Mise en service Firebase (≈ 10 minutes)

L'application résident (APK) et le tableau de bord agence partagent le projet Firebase **`immo-agency-53c66`**. Sa configuration web publique est déjà dans `src/config/firebase.ts`. Il reste à activer les services dans la console et à publier les règles de sécurité.

Tout fonctionne avec l'offre gratuite **Spark** : pas de Cloud Functions ni de Cloud Storage. Les photos sont compressées et stockées dans Firestore.

> Ne partagez jamais de **clé de compte de service** (fichier JSON « service account »). Les applications n'en ont pas besoin, et personne ne doit vous la demander.

## 1. Authentication

1. Ouvrez [console.firebase.google.com](https://console.firebase.google.com) et choisissez le projet **immo-agency**.
2. Allez dans **Créer → Authentication**, puis cliquez sur **Commencer**.
3. Dans l'onglet **Mode de connexion**, activez **Adresse e-mail/Mot de passe**. Laissez « Lien par e-mail » désactivé, puis enregistrez.
4. Dans **Paramètres → Domaines autorisés**, cliquez sur **Ajouter un domaine** et saisissez `oussdsgn.github.io`. `localhost`, utilisé par l'APK, y figure déjà.

## 2. Firestore

1. Allez dans **Créer → Firestore Database**, puis cliquez sur **Créer une base de données**.
2. Choisissez l'édition **Standard** et l'emplacement `europe-west1` (Belgique) ou `eur3`. L'emplacement ne peut plus être changé ensuite.
3. Choisissez le **mode production**.

## 3. Règles de sécurité (indispensable)

Sans cette étape, le mode production refuse tout : l'app et le tableau de bord afficheront des erreurs.

1. Dans **Firestore Database**, ouvrez l'onglet **Règles**.
2. Remplacez tout le contenu par celui du fichier [`firebase/firestore.rules`](../firebase/firestore.rules).
3. Cliquez sur **Publier**.

Autre possibilité, depuis un ordinateur avec ce dépôt :

```bash
npm install
npx firebase login
npx firebase deploy --only firestore:rules
```

Republiez les règles à chaque modification de `firebase/firestore.rules`. La CI les teste sur l'émulateur, mais elle ne les déploie pas.

## 4. Tableau de bord sur GitHub Pages

1. Sur GitHub, allez dans **Settings → Pages → Build and deployment**, puis choisissez **Source : GitHub Actions**.
2. À chaque push sur `main`, le workflow « Dashboard (GitHub Pages) » publie le tableau de bord sur `https://oussdsgn.github.io/immo-agency/`.

## 5. Premier administrateur

1. Ouvrez le tableau de bord, cliquez sur **Demander un accès** et créez votre compte.
2. Sur l'écran « Compte en attente », cliquez sur **Première installation : devenir administrateur**. Cela ne fonctionne qu'une seule fois : les comptes suivants devront être validés dans **Équipe**.
3. Facultatif : dans **Immeubles**, cliquez sur **Charger les exemples** pour avoir deux résidences fictives, des techniciens et des annonces. Les codes de test sont `BAHIA12A`, `BAHIA14A`, `BAHIA21B` et `JARDIN4C`. Sinon, créez directement vos résidences, bâtiments et logements.

## 6. Résidents

1. Dans **Immeubles**, chaque logement a un code d'accès à 8 caractères. Le bouton « Copier l'invitation » prépare un message avec le lien de l'APK et le code.
2. Le résident installe l'APK, crée son compte avec ce code, et retrouve son logement.

L'APK publié depuis `main` est connecté à Firebase. Pour reconstruire une version de démonstration, avec des données fictives sur l'appareil, ajoutez dans GitHub la variable de dépôt `VITE_DATA_SOURCE=mock` (**Settings → Secrets and variables → Actions → Variables**).

## Développement local (émulateurs)

Les émulateurs Auth et Firestore nécessitent Java 21. Ils n'utilisent jamais le vrai projet.

```bash
npm run emulators                                                                   # Auth :9099, Firestore :8080
VITE_DATA_SOURCE=firebase VITE_FIREBASE_EMULATOR=127.0.0.1 npx vite --port 5174   # app résident
VITE_FIREBASE_EMULATOR=127.0.0.1 npm run dev:dashboard -- --port 5180            # tableau de bord
node scripts/e2e-connected.mjs                                                      # parcours croisé (efface les émulateurs)
npm run test:rules                                                                  # tests des règles (lance son propre émulateur)
```

## Limites de l'offre gratuite

L'offre Spark compte par jour 50 000 lectures et 20 000 écritures Firestore, et 1 Gio de stockage. C'est largement suffisant pour un pilote de plusieurs résidences. Le stockage des photos est le premier poste : chaque photo compressée pèse environ 100 à 300 Ko.
