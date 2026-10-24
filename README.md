# IMMO Agency — application résident

Application mobile-first pour les résidents des biens gérés par l'agence : consulter son logement, **signaler un problème** et suivre son traitement, recevoir les mises à jour de l'agence, découvrir des biens à acquérir. Interface en **français** (par défaut) et en **arabe** (RTL complet).

## 📱 Télécharger l'application Android

**[⬇️ Télécharger IMMO-Agency.apk](https://github.com/oussdsgn/immo-agency/releases/latest/download/IMMO-Agency.apk)** — ouvrez ce lien depuis votre téléphone Android (Android 7 ou plus récent).

<img src="docs/download-qr.png" alt="QR code vers le téléchargement de l'APK" width="160" />

Depuis un ordinateur, scannez ce QR code avec le téléphone. Android vous demandera peut-être d'autoriser l'installation d'applications inconnues pour votre navigateur. Le lien sert toujours la dernière version construite depuis `main` ([page de la release](https://github.com/oussdsgn/immo-agency/releases/latest)).

> **Prototype frontend.** Toutes les données sont **fictives** et stockées dans le navigateur. Aucun signalement, message ou demande n'est transmis à une agence réelle. L'application le dit clairement partout où cela compte (confirmation, fiches, profil).

Périmètre : seulement l'application résident. Le tableau de bord de l'agence existe déjà ; cette application est conçue pour s'y connecter plus tard via une API.

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

L'interface ne dépend que de `services` (`src/services/index.ts`), qui expose l'interface `Services` de `contracts.ts`. Seule l'implémentation simulée existe aujourd'hui (latence, persistance en localStorage, pannes optionnelles).

## Simulé ou à construire

| Domaine | Aujourd'hui (prototype) | À prévoir pour la production |
| --- | --- | --- |
| Authentification | Compte de démonstration, sans mot de passe | Fournisseur d'identité de l'agence, session httpOnly ou jetons courts, gestion de l'expiration |
| Biens et résident | Données fictives locales | API de gestion de l'agence |
| Signalements et historique | Stockés dans localStorage | API ; références attribuées par le serveur |
| Photos | Redimensionnées et stockées en data URL | Envoi vers un stockage objet via URL pré-signée, contrôle antivirus et du type |
| Mises à jour de l'agence | Simulateur de développement | Événements du backend de l'agence |
| Notifications | Liste locale | Push (Web Push ou FCM / APNs) et flux temps réel ; les préférences sont prêtes |
| Annonces « Acquérir » | Fictives, demandes non transmises | Flux d'annonces et CRM de l'agence |

### Sécurité

- Aucun secret dans le client. Ne jamais placer de clé d'API dans une variable `VITE_*`, car elles sont intégrées au bundle.
- localStorage **n'est pas** un stockage sûr : il ne sert qu'aux données fictives. Le prototype ne conserve pas les coordonnées saisies dans les demandes d'acquisition.
- La garde de routes côté client sert uniquement l'expérience utilisateur. Le backend devra vérifier à chaque requête que le résident n'accède qu'à ses propres biens et signalements. Le mock imite déjà ce contrôle.
- Les champs sont validés côté client ; le serveur devra refaire cette validation.
- Les erreurs réseau, de session expirée (`unauthorized`) et de stockage plein sont gérées et affichées. Une panne réseau ne déconnecte pas le résident.

## Prochaines étapes recommandées

1. Obtenir le contrat d'API de l'agence et écrire `src/services/http/`, qui implémente `Services`, sélectionné par `VITE_DATA_SOURCE`.
2. Brancher l'authentification réelle des résidents et retirer le compte de démonstration.
3. Faire correspondre les catégories (`agencyCode`) et les statuts au workflow réel de l'agence.
4. Envoyer les photos vers un stockage objet ; ajouter un mode hors ligne ou une file d'envoi.
5. Ajouter les notifications push, un service worker et l'installation PWA (le manifeste est déjà là).
6. Faire relire les traductions arabes par un locuteur natif, puis tester sur de vrais appareils (iOS Safari, Android Chrome) et avec des lecteurs d'écran.
7. Remplacer les illustrations générées par les photos des biens fournies par l'agence.
