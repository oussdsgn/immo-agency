# IMMO Agency — application résident

Application mobile-first pour les résidents des biens gérés par l'agence : consulter son logement, **signaler un problème** et suivre son traitement, recevoir les mises à jour de l'agence, découvrir des biens à acquérir. Interface en **français** (par défaut) et en **arabe** (RTL complet).

## 📱 Télécharger l'application Android

**[⬇️ Télécharger IMMO-Agency.apk](https://github.com/oussdsgn/immo-agency/releases/latest/download/IMMO-Agency.apk)** — ouvrez ce lien depuis votre téléphone Android (Android 7 ou plus récent).

<img src="docs/download-qr.png" alt="QR code vers le téléchargement de l'APK" width="160" />

Depuis un ordinateur, scannez ce QR code avec le téléphone. Android vous demandera peut-être d'autoriser l'installation d'applications inconnues pour votre navigateur. Le lien sert toujours la dernière version construite depuis `main` ([page de la release](https://github.com/oussdsgn/immo-agency/releases/latest)).

## Deux applications, un serveur

| | Pour qui | Où |
| --- | --- | --- |
| **Application résident** (`src/`) | Résidents : signaler, suivre, échanger, annonces, urgences | APK Android, ou web |
| **Tableau de bord agence** (`dashboard/`) | Équipe de l'agence : alertes en direct, traitement, planification des techniciens, immeubles et codes logement, annonces | Navigateur : `https://<compte>.github.io/immo-agency/` |
| **Backend Firebase** (`firebase/`) | Comptes (Authentication), données, photos et temps réel (Firestore), règles d'accès | Projet Firebase `immo-agency-53c66` (offre gratuite Spark) |

👉 **Mise en service :** suivez [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md), environ 10 minutes.

**Modes de l'application résident** (variable `VITE_DATA_SOURCE` au build)
- **Connectée** (`firebase`, par défaut pour les builds et l'APK) : les comptes sont réels, les données partagées avec le tableau de bord et les mises à jour arrivent en direct.
- **Démonstration** (`mock`, par défaut pour `npm run dev`) : les données sont fictives et stockées sur l'appareil, et un simulateur imite les réponses de l'agence. Rien n'est transmis.

## Démarrage

Prérequis : Node.js 20+ (testé avec Node 22) et npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Typecheck + build de production dans `dist/` |
| `npm run preview` | Sert le build de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (Vitest) : domaine, i18n, couche de services simulée |
| `npm run android:apk` | Build web + APK Android debug (voir plus bas) |
| `npm run test:rules` | Tests des règles de sécurité Firestore sur l'émulateur (47 vérifications ; Java 21 requis) |
| `npm run emulators` | Émulateurs Firebase locaux (Auth + Firestore) |
| `npm run e2e` | Parcours de bout en bout (28 étapes, FR + AR) sur un serveur lancé. Nécessite Chromium : `CHROMIUM_PATH=/chemin/vers/chrome npm run e2e` |

À l'ouverture, choisissez **« Continuer avec le compte de démonstration »**.

## Application Android (APK)

L'application Android est une coque native [Capacitor](https://capacitorjs.com) autour du même code web (`android/`, `capacitor.config.ts`). Identifiant : `com.immoagency.resident`. Android 7 (API 24) minimum.

**Télécharger l'APK depuis GitHub**
- À chaque push sur `main`, le workflow **Android APK** (`.github/workflows/android-apk.yml`) lance les vérifications, construit l'APK et le publie dans la release **apk-latest**. C'est le lien de téléchargement direct en haut de ce fichier.
- Pour les autres branches et les pull requests, l'APK est disponible en artefact (onglet *Actions* → exécution → **IMMO-Agency-apk**, connexion GitHub requise).
- Pour chaque tag `v*` (par exemple `v0.1.0`), l'APK est aussi joint à une *Release* GitHub.

**Construire en local** (JDK 21 et Android SDK avec la plateforme 36 nécessaires) :

```bash
npm run android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

L'APK est une version **debug**, signée avec la clé de debug : pratique pour tester, mais pas pour le Play Store. Pour publier, il faut créer une clé de signature, la garder hors du dépôt (secret GitHub Actions) et construire une version *release* (`bundleRelease`).

Icônes et écran de démarrage : générés à partir de `assets/` avec `npx capacitor-assets generate --android`.

## Fonctionnalités

- **Accueil** : salutation, logement principal, bouton « Signaler un problème » mis en avant, alertes « action requise », signalements actifs et dernière mise à jour, annonces de la résidence, raccourcis vers les biens, lien secondaire vers « Acquérir », compteur de notifications.
- **Mes biens** : liste et fiche détaillée (bâtiment, étage, appartement, surface, équipements, contact de la résidence, signalements du bien, bouton « Signaler un problème ici » qui présélectionne le bien).
- **Signaler un problème** (parcours guidé) : bien (étape masquée s'il n'y en a qu'un), catégorie, détails (titre, description, emplacement, jusqu'à 4 photos avec aperçu, remplacement et suppression, urgence expliquée sans promesse de délai), vérification modifiable, puis confirmation avec une référence de développement `DEV-AAAA-NNNN`.
  - Validation par étape, avec des messages qui disparaissent dès que le champ est corrigé.
  - Le brouillon est conservé (sessionStorage) après un rechargement, un changement de langue ou une navigation.
  - Double envoi impossible ; en cas d'échec, les données sont conservées et un bouton « Réessayer » s'affiche.
- **Signalements** : liste filtrable par statut et par bien (filtres conservés dans l'URL) ; détail avec référence, statut en lecture seule, historique chronologique, photos (visionneuse), échanges avec l'agence, réponse du résident avec photos.
- **Statuts** : Soumis, En cours d'examen, En cours de traitement, Informations requises, Résolu, Clôturé, Refusé (`src/domain/reportWorkflow.ts`, à faire correspondre au workflow réel de l'agence).
- **Confirmation de résolution** : quand l'agence passe un signalement à *Résolu*, le résident répond « Le problème est-il réglé ? ».
  - Oui : il donne une note de 1 à 5 étoiles et un commentaire facultatif.
  - Non : il explique ce qui ne va pas, et le signalement repasse *En cours de traitement*, avec l'explication dans l'historique et les échanges.
  - L'accueil rappelle les résolutions en attente de confirmation.
- **Urgences** (`/urgences`) : numéros nationaux à composer d'un geste, lignes d'astreinte et gardien de la résidence, premiers gestes (gaz, fuite d'eau, coupure, ascenseur) avec un lien vers un signalement pré-rempli.
  - Accessible depuis l'accueil, le profil, la barre latérale et le choix « Urgent » du formulaire.
  - Les numéros nationaux (14, 17, 1055, 3303) sont intégrés à l'application (`src/data/emergency.ts`). Faites-les vérifier par l'agence avant la mise en production.
- **Présentation au premier lancement** (`/bienvenue`) : 4 écrans courts (bienvenue, signaler, suivre, rester informé).
  - Navigation par balayage, flèches du clavier (inversées en arabe), points ou boutons ; bouton « Passer » ; sélecteur de langue.
  - Elle s'affiche une fois par appareil et peut être revue depuis Profil → « Revoir la présentation ».
- **Notifications** : signalement envoyé, changement de statut, demande d'informations, résolution, annonces. Chaque notification renvoie au signalement ou au bien concerné ; marquage lu et « tout marquer comme lu ».
- **Acquérir** : annonces fictives (vente ou location, appartement ou maison), fiche détaillée, demande d'informations validée. Le prix est affiché seulement s'il existe, sinon « Prix sur demande ». États de chargement, liste vide et erreur.
- **Profil** : compte de démonstration clairement indiqué, coordonnées, langue, préférences de notification, confidentialité, page « À propos » (ce qui est simulé), déconnexion.
- **Outils de démonstration** (`/dev`, et le panneau « Simulation agence » sur chaque signalement) : simuler les mises à jour de l'agence, qui sont marquées « Simulé » dans l'historique, passer à un compte vide pour voir les états vides, simuler des pannes réseau. Ces outils ne sont affichés que lorsque la source de données simulée est active.

### Langues et RTL

- Dictionnaires typés `src/i18n/fr.ts` (source) et `src/i18n/ar.ts`. TypeScript et un test garantissent qu'ils ont exactement les mêmes clés et les mêmes variables.
- Les pluriels utilisent `Intl.PluralRules`, avec les 6 formes de l'arabe (zéro, un, deux, quelques, beaucoup, autre).
- `dir="rtl"` est appliqué à la racine, les styles utilisent des propriétés logiques (`ms-`, `start-`, `text-start`…) et les icônes directionnelles sont inversées.
- Le texte saisi par les utilisateurs (`dir="auto"`, `<bdi>`) et les valeurs insérées dans les phrases arabes sont isolés, pour que le texte français et les références restent lisibles.
- Polices : Plus Jakarta Sans (latin) et IBM Plex Sans Arabic, intégrées à l'application (aucun CDN).
- Dates, nombres et monnaie suivent les conventions algériennes (`fr-DZ`, `ar-DZ`, DZD « DA »), avec des chiffres latins.
- Changer de langue ne fait que re-rendre l'interface : la page et les formulaires en cours sont conservés.

## Architecture

```
src/
  app/            routes, session (garde d'accès UX)
  components/
    layout/       AppShell (barre du bas mobile / barre latérale desktop), logo, sélecteur de langue
    ui/           design system : Button, Card, Badge, champs, Segmented, Switch, états, dialog, toast, illustration
  domain/         règles métier pures : validation, workflow des statuts
  features/       home, properties, reports (+ new/), acquisition, notifications, profile, auth, dev
  i18n/           dictionnaires, traduction, formatage Intl, provider
  services/       contrats (contracts.ts), erreurs, bus d'événements, implémentation simulée (mock/)
  data/           données fictives et catégories configurables
  types/          modèles typés partagés
  styles/         tokens du design (couleurs, typo, rayons, ombres) via Tailwind v4 @theme
```

Stack : React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide. La validation est écrite à la main (aucune bibliothèque de formulaires nécessaire).

L'interface ne dépend que de `services` (`src/services/index.ts`), qui expose l'interface `Services` de `contracts.ts`. Deux implémentations : `mock/` (latence, persistance en localStorage, pannes optionnelles) et `firebase/` (Firebase Auth + Firestore). Les écritures Firestore partagées par l'app, le tableau de bord et les tests sont dans `src/services/firebase/ops.ts`.

## Tableau de bord agence

- **Alertes en direct** : nouveau signalement, réponse d'un résident, problème toujours présent, nouvel avis. Chacune s'affiche en notification sur l'écran avec un lien « Ouvrir » et un son (double bip si urgent, désactivable). Si le navigateur l'autorise, une notification apparaît aussi quand l'onglet est en arrière-plan.
- **Signalements** : boîte de réception filtrable (statut, urgence, résidence, technicien, recherche).
  - La fiche montre les photos, les coordonnées du résident, l'historique et les échanges.
  - Les actions de statut sont limitées aux étapes que le workflow autorise.
- **Interventions** : file « à planifier » et planning par technicien, avec les retards signalés. La planification (technicien, date et heure, note) notifie le résident ; le technicien et le rendez-vous apparaissent dans son application.
- **Demandes d'informations** : la question passe le signalement en « Informations requises » et le résident est notifié.
- **Immeubles** : résidences (contacts et numéros d'astreinte affichés dans l'écran Urgences de l'app), bâtiments et logements.
  - Chaque logement a un **code d'accès**, avec copie d'une invitation prête à envoyer et régénération.
  - On y voit les occupants rattachés, et on peut leur retirer l'accès.
- **Techniciens**, **Annonces** (français et arabe, notifiées aux résidents de la résidence), **Demandes d'achat ou de location**.
- **Équipe** (administrateurs) : validation des demandes d'accès et gestion des rôles.

## Backend et sécurité

- **Règles Firestore** (`firebase/firestore.rules`) : un résident ne voit que ses logements, leurs signalements, sa résidence et ses annonces. Un code logement ne se lit qu'un par un (pour vérifier un code), jamais en liste.
- **Workflow imposé par les règles** :
  - seules les transitions de statut autorisées passent ;
  - chaque changement de statut ou planification doit écrire son entrée d'historique dans le même lot ;
  - un résident ne peut que déposer, répondre, confirmer (note de 1 à 5, une seule fois) ou signaler que le problème persiste.
- **Identité vérifiée** : l'auteur des messages, des photos et des événements doit être l'utilisateur connecté, et les dates sont celles du serveur. La référence `SR-AAAA-NNNN` vient d'un compteur incrémenté dans la même transaction.
- **Photos** : compressées dans l'app et stockées dans Firestore (moins de 900 Ko, images uniquement), lisibles par l'agence et les occupants du logement seulement. Pas besoin de Cloud Storage ni de l'offre payante.
- **Comptes** : les comptes agence restent « en attente » jusqu'à validation par un administrateur. Le premier administrateur se désigne une seule fois.
- **Tests** : `npm run test:rules` (47 vérifications, également exécutées en CI) et `scripts/e2e-connected.mjs` (14 étapes croisées application ⇄ tableau de bord sur les émulateurs).

### Sécurité

- Seule la configuration web **publique** de Firebase est intégrée aux applications (`src/config/firebase.ts`) : c'est prévu ainsi par Firebase, les règles protègent les données. Aucune clé de compte de service ne doit s'y trouver.
- En mode démonstration, localStorage ne sert qu'aux données fictives. En mode connecté, la session est gérée par Firebase Authentication.
- Les gardes de routes côté client ne servent qu'à l'expérience utilisateur : chaque lecture et écriture est vérifiée par les règles.
- Les champs sont validés côté client **et** par les règles (longueurs, valeurs autorisées).
- Les erreurs réseau, de session expirée (`unauthorized`) et de stockage plein sont gérées et affichées. Une panne réseau ne déconnecte pas le résident.

## Prochaines étapes recommandées

1. Faire la mise en service ([docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)) et lancer un pilote sur une résidence.
2. Personnaliser l'e-mail de réinitialisation du mot de passe (Authentication → Modèles).
3. Ajouter les notifications push sur téléphone (Firebase Cloud Messaging). Les préférences de notification sont déjà en place.
4. Signer une version *release* de l'APK pour le Play Store, avec une clé conservée en secret GitHub.
5. Ajouter la photo d'intervention côté agence, et l'export des signalements (CSV) pour le reporting.
6. Faire relire les traductions arabes et proposer le tableau de bord en arabe.
