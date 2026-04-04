# H2VL Connect — Documentation projet pour Claude

## Vue d'ensemble

Application de gestion interne de l'association **H2VL** (Handisport Val de Loire).
Permet aux administrateurs de gérer les adhérents, les événements, les inscriptions, les cotisations et les communications par e-mail.

- **Framework** : Next.js 15 (App Router)
- **Base de données** : Firebase Firestore
- **Auth** : Firebase Authentication
- **Hébergement** : Firebase App Hosting (Cloud Run) + CDN Firebase Hosting
- **Emails** : Nodemailer via Gmail SMTP (compte `ateliernumerique37@gmail.com`)
- **UI** : shadcn/ui (Radix UI + Tailwind CSS)
- **PWA** : `@ducanh2912/next-pwa`
- **Dépôt** : `ateliernumerique37-tech/h2vl-connect` (privé)

---

## Projet Firebase

- **Project ID** : `studio-6079106449-cf583`
- **Backend App Hosting** : `studio` (région `us-central1`)
- **Auth domain** : `studio-6079106449-cf583.firebaseapp.com`

---

## Architecture

### Pages publiques (sans authentification)
| Route | Description |
|---|---|
| `/login` | Connexion administrateur |
| `/forgot-password` | Réinitialisation mot de passe |
| `/signup` | Redirige vers `/login` (désactivé — création via dashboard uniquement) |
| `/lien/confirmation/[jeton]` | Accusé de réception d'un e-mail (tracking) |
| `/lien/inscription-invitation/[jeton]` | Auto-inscription à un événement via lien d'invitation |
| `/lien/annulation/[jeton]` | Annulation d'une inscription via lien dans l'email |

### Dashboard (authentification requise)
| Route | Description |
|---|---|
| `/dashboard` | Page d'accueil du tableau de bord |
| `/dashboard/adherents` | Liste des adhérents |
| `/dashboard/adherents/create` | Créer un adhérent |
| `/dashboard/adherents/[id]` | Fiche adhérent |
| `/dashboard/events` | Liste des événements |
| `/dashboard/events/create` | Créer un événement |
| `/dashboard/events/[id]` | Détail événement + gestion inscriptions |
| `/dashboard/events/[id]/edit` | Modifier un événement |
| `/dashboard/admin` | Gestion des administrateurs |
| `/dashboard/communication` | Campagnes e-mail + invitations |
| `/dashboard/stats` | Statistiques |
| `/dashboard/profile` | Profil de l'administrateur connecté |

### API Routes (Next.js App Router)
| Route | Rôle | Auth requise |
|---|---|---|
| `POST /api/send-email` | Envoi d'un e-mail (confirmation inscription, anniversaire, campagne) | Non (appelé côté serveur) |
| `POST /api/send-invitation` | Envoi d'une invitation à un événement avec lien d'auto-inscription | Non |
| `POST /api/create-admin` | Crée un compte Firebase Auth + doc Firestore admins | Bearer token admin |
| `POST /api/delete-admin` | Supprime un admin (Auth + Firestore), protège le dernier admin | Bearer token admin |
| `POST /api/cancel-inscription` | Annule une inscription via jeton d'annulation (Admin SDK) | Non (jeton secret) |
| `POST /api/confirm-read` | Obsolète — retourne 410 | — |

---

## Collections Firestore

| Collection | Description | Règles |
|---|---|---|
| `admins/{uid}` | Profils admins — l'ID doc = UID Firebase Auth | Lecture : admin ou owner. Écriture : Admin SDK uniquement (`allow create/delete: if false`) |
| `adherents/{id}` | Membres de l'association | Lecture/écriture : admin uniquement |
| `evenements/{id}` | Événements | Lecture : connecté. Écriture : admin |
| `inscriptions/{id}` | Inscriptions aux événements | Lecture : connecté. Écriture : admin |
| `cotisations/{id}` | Cotisations annuelles | Admin uniquement |
| `email_campaigns/{id}` | Campagnes e-mail envoyées | Admin uniquement |
| `email_tracking/{jeton}` | Suivi des accusés de réception | **Public** (lecture/écriture) |
| `invitations_evenement/{jeton}` | Invitations événement avec lien auto-inscription | **Public** (lecture/écriture) |
| `annulations_inscription/{jeton}` | Jetons d'annulation d'inscription | **Lecture/création publique**, mise à jour par Admin SDK uniquement |
| `logs_anniversaires/{id}` | Historique envois e-mail anniversaire | Admin uniquement |
| `logs_admin/{id}` | Historique des actions admin | Admin uniquement |
| `roles_admins/{id}` | Ancienne collection (compatibilité) | Lecture : connecté |

### Structure clé : `invitations_evenement/{jeton}`
```json
{
  "evenementId": "...",
  "eventTitle": "...",
  "adherentId": "...",
  "adherentEmail": "...",
  "adherentFirstName": "...",
  "statut": "envoyé | inscrit",
  "dateEnvoi": "ISO string",
  "dateInscription": "ISO string | null"
}
```

### Structure clé : `annulations_inscription/{jeton}`
```json
{
  "inscriptionId": "...",
  "evenementId": "...",
  "eventTitle": "...",
  "utilisé": false,
  "createdAt": "ISO string",
  "dateAnnulation": "ISO string (après usage)"
}
```

---

## Types TypeScript (`src/lib/types.ts`)

```typescript
Adherent       // Membre de l'association
Evenement      // Événement (avec necessiteMenu?, optionsMenu?, estSortieBowling?)
Inscription    // Inscription à un événement (avec choixMenu?, choixBowling?)
Cotisation     // Cotisation annuelle
Admin          // Compte administrateur
LogAdmin       // Log d'action admin
LogAnniversaire
CampagneEmail
EmailTracking
InvitationEvenement
```

### Champs spéciaux `Evenement`
- `necessiteMenu?: boolean` — active le choix de menu à l'inscription
- `optionsMenu?: { aperitifs?, entrees?, plats?, fromages?, desserts? }` — listes d'options
- `estSortieBowling?: boolean` — active les options bowling à l'inscription

### Champs spéciaux `Inscription`
- `choixMenu?: { aperitifChoisi?, entreeChoisie?, platChoisi?, fromageChoisi?, dessertChoisi? }`
- `choixBowling?: { avecBarrieres?, sansBarrieres?, prendGouter? }`

---

## Firebase (client-side)

### Hooks disponibles (via `@/firebase`)
```typescript
useAuth()         // Firebase Auth instance
useFirestore()    // Firestore instance
useDoc<T>(ref)    // Lecture d'un document en temps réel — retourne { data, isLoading, error }
useCollection<T>  // Lecture d'une collection en temps réel
useMemoFirebase() // Mémoïsation stable de refs Firestore
```

### Initialisation dans les pages publiques (sans Provider)
```typescript
import { initializeFirebase } from '@/firebase';
const { firestore: db } = initializeFirebase();
```

### Initialisation dans les pages du dashboard (avec Provider)
```typescript
import { useFirestore, useAuth } from '@/firebase';
const db = useFirestore();
const auth = useAuth();
```

### Bug connu — `useDoc` race condition (corrigé)
`isLoading` doit être initialisé à `true` si la ref est non-null, sinon `notFound()` se déclenche avant le premier snapshot Firestore. Fix appliqué dans `src/firebase/firestore/use-doc.tsx` : `useState<boolean>(() => memoizedDocRef != null)`.

---

## Firebase Admin SDK (server-side)

Fichier : `src/lib/firebase-admin.ts`

```typescript
import { adminAuth } from '@/lib/firebase-admin'; // Firebase Auth Admin
import { adminDb } from '@/lib/firebase-admin';   // Firestore Admin (bypass règles)
```

En production (Firebase App Hosting / Cloud Run), les credentials sont injectés automatiquement via **Application Default Credentials (ADC)**.
En développement local, définir `GOOGLE_APPLICATION_CREDENTIALS` pointant vers un fichier de service account.

---

## Variables d'environnement

Définies dans `apphosting.yaml` (disponibles au runtime sur Cloud Run) :

| Variable | Valeur |
|---|---|
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `465` |
| `EMAIL_USER` | `ateliernumerique37@gmail.com` |
| `EMAIL_PASS` | `deyqfrobqwyfagsf` (mot de passe d'application Gmail) |
| `EMAIL_FROM_NAME` | `Gestion de l'association H2VL` |

En développement local, copier ces valeurs dans un fichier `.env.local`.

---

## Déploiement

### Application (automatique)
Firebase App Hosting est connecté au dépôt GitHub.
**Chaque push sur `main` déclenche automatiquement un build et un déploiement** de l'application Next.js.

### Règles et indexes Firestore (manuel)
Les règles et indexes Firestore ne se déploient **pas** automatiquement.
À chaque modification de `firestore.rules` ou `firestore.indexes.json`, déployer manuellement depuis **Cloud Shell** :

```bash
# Dans Cloud Shell, depuis le répertoire du projet cloné
cd h2vl-connect && git pull
firebase deploy --only firestore --project studio-6079106449-cf583
```

Pour cloner si pas encore fait :
```bash
git clone https://github.com/ateliernumerique37-tech/h2vl-connect.git
```

> Le dépôt doit être **public** pour le clonage sans token. Le repasser en **privé** après.

### Accès public Cloud Run (à faire une seule fois, persiste)
Firebase App Hosting ne supporte pas `invoker: public` dans `apphosting.yaml`.
La commande suivante a été exécutée manuellement et **ne doit pas être relancée** :
```bash
gcloud run services add-iam-policy-binding studio \
  --region us-central1 \
  --project studio-6079106449-cf583 \
  --member allUsers \
  --role roles/run.invoker
```

---

## E-mails

### API `POST /api/send-email`

Paramètres acceptés :
```typescript
{
  to: string,
  firstName: string,
  adherentId?: string,
  campaignId?: string,
  type?: 'birthday' | 'campaign',   // absent = confirmation d'inscription
  customMessage?: string,            // pour birthday
  subject?: string,
  eventTitle?: string,
  eventDate?: string,
  eventLocation?: string,
  campaignSubject?: string,
  campaignBody?: string,
  menuChoices?: Record<string, string>,   // choix de menu à afficher dans l'email
  bowlingChoices?: Record<string, boolean>, // options bowling à afficher
  annulationUrl?: string,            // lien d'annulation à inclure dans l'email
}
```

### Tracking e-mail
Chaque e-mail contient un lien **"Accuser réception"** vers `/lien/confirmation/[jeton]`.
Le jeton est stocké dans `email_tracking/{jeton}` avec `statut: 'envoyé'`.
Quand l'utilisateur clique, le statut passe à `confirmé` et `dateLecture` est renseignée.

### Lien d'annulation d'inscription
Chaque e-mail de confirmation d'inscription contient un lien vers `/lien/annulation/[jeton]`.
Le jeton est stocké dans `annulations_inscription/{jeton}`.
L'annulation appelle `POST /api/cancel-inscription` qui utilise le **Admin SDK** pour supprimer l'inscription.

---

## Gestion des administrateurs

- La page `/signup` est désactivée (redirige vers `/login`)
- Les admins se créent **uniquement depuis le dashboard** → `/dashboard/admin`
- La création passe par `POST /api/create-admin` (Admin SDK) :
  1. Vérifie le Bearer token du demandeur
  2. Crée le compte Firebase Auth avec `createUser()`
  3. Crée le doc Firestore `admins/{uid}` avec l'UID comme ID de document
- La suppression passe par `POST /api/delete-admin` (Admin SDK) :
  1. Vérifie qu'il reste au moins 1 admin
  2. Supprime le compte Firebase Auth
  3. Supprime le doc Firestore
- **Règle importante** : `isAdmin()` vérifie `exists(/admins/{request.auth.uid})` — l'ID du doc doit être l'UID Firebase Auth, pas un ID aléatoire

---

## Fonctionnalités événements

### Menu restaurant
- Activé via le switch **"Cet événement nécessite un choix de menu"** à la création/édition
- Options définies par l'admin (champ texte, valeurs séparées par virgules)
- À l'inscription d'un adhérent → RadioGroup par catégorie (Apéritif, Entrée, Plat, Fromage, Dessert)
- Les choix s'affichent dans la liste des inscrits et dans l'export CSV
- Les choix s'affichent dans l'e-mail de confirmation

### Sortie bowling
- Activé via le switch **"C'est une sortie bowling"** à la création/édition
- À l'inscription → 3 cases à cocher :
  - **Avec barrières** (s'exclut mutuellement avec "Sans barrières")
  - **Sans barrières** (s'exclut mutuellement avec "Avec barrières")
  - **Prend le goûter de l'amitié**
- Les choix s'affichent dans la liste des inscrits et dans l'export CSV
- Les choix s'affichent dans l'e-mail de confirmation

### Invitation par lien
1. L'admin envoie des invitations depuis la page de détail d'un événement
2. Chaque adhérent non inscrit reçoit un e-mail avec un lien unique `/lien/inscription-invitation/[jeton]`
3. Si l'événement a un menu ou est une sortie bowling → page de choix avant confirmation
4. Après inscription → e-mail de confirmation avec les choix + lien d'annulation

---

## Sécurité — points importants

- **Les routes `/lien/*` sont exclues du Service Worker PWA** (`navigateFallbackDenylist: [/^\/lien/]`) pour éviter que le SW intercepte les liens d'e-mail
- **Firebase Hosting intercepte `/public/*`** comme des fichiers statiques → toutes les routes publiques dynamiques sont sous `/lien/` (pas `/public/`)
- **`allow create: if false`** sur `admins` → impossible de créer un admin directement depuis le client, même connecté → passe obligatoirement par l'API Admin SDK
- **`annulationUrl`** utilise un UUID unique par inscription → non-devinable, à usage unique

---

## Structure des fichiers clés

```
├── apphosting.yaml              # Config Firebase App Hosting (env vars, Cloud Run)
├── firebase.json                # Config Firebase (firestore rules/indexes)
├── firestore.rules              # Règles de sécurité Firestore
├── firestore.indexes.json       # Index composites Firestore
├── next.config.ts               # Config Next.js + PWA
├── src/
│   ├── app/
│   │   ├── (auth)/              # Pages login / forgot-password / signup
│   │   ├── api/                 # Routes API Next.js
│   │   │   ├── send-email/      # Envoi e-mail (confirmation, anniversaire, campagne)
│   │   │   ├── send-invitation/ # Envoi invitation événement
│   │   │   ├── create-admin/    # Création admin (Admin SDK)
│   │   │   ├── delete-admin/    # Suppression admin (Admin SDK)
│   │   │   └── cancel-inscription/ # Annulation inscription (Admin SDK)
│   │   ├── dashboard/           # Pages du tableau de bord (protégées)
│   │   ├── lien/                # Pages publiques accessibles par lien e-mail
│   │   │   ├── confirmation/    # Accusé de réception e-mail
│   │   │   ├── inscription-invitation/ # Auto-inscription par invitation
│   │   │   └── annulation/      # Annulation d'inscription
│   │   └── error.tsx            # Error boundary global (erreurs Firestore)
│   ├── components/
│   │   ├── ui/                  # Composants shadcn/ui
│   │   ├── FirebaseErrorListener.tsx  # Écoute les erreurs permission-denied globales
│   │   ├── adherent-card.tsx
│   │   └── event-card.tsx
│   ├── firebase/                # Hooks et initialisation Firebase client
│   │   ├── index.ts             # Exports + initializeFirebase()
│   │   ├── config.ts            # firebaseConfig (clés publiques)
│   │   ├── provider.tsx         # FirebaseProvider (contexte Auth + Firestore)
│   │   └── firestore/
│   │       ├── use-doc.tsx      # Hook temps réel document unique
│   │       └── use-collection.tsx # Hook temps réel collection
│   ├── lib/
│   │   ├── types.ts             # Tous les types TypeScript du projet
│   │   ├── firebase-admin.ts    # Admin SDK (adminAuth, adminDb)
│   │   └── utils.ts             # cn() et autres utilitaires
│   └── services/                # Fonctions d'accès Firestore (client)
│       ├── adminsService.ts     # CRUD admins (via API pour create/delete)
│       ├── adherentsService.ts
│       ├── evenementsService.ts
│       ├── inscriptionsService.ts
│       └── logsService.ts
```

---

## Conventions de code

- Toutes les pages du dashboard utilisent `'use client'` et les hooks Firebase
- Les pages publiques (`/lien/*`) utilisent `initializeFirebase()` directement (pas de Provider)
- Les API routes utilisent `firebase-admin` côté serveur uniquement
- Les composants UI viennent tous de `@/components/ui/` (shadcn/ui)
- Icônes : `lucide-react` uniquement
- Accessibilité : WCAG 2.2 — `aria-label`, `role`, `aria-live` sur tous les éléments interactifs et les zones de statut
- `export const dynamic = 'force-dynamic'` sur toutes les pages publiques avec paramètres dynamiques

---

## Commandes utiles

```bash
# Développement local
npm run dev

# Build de production
npm run build

# Déployer les règles Firestore (depuis Cloud Shell)
firebase deploy --only firestore --project studio-6079106449-cf583

# Passer le dépôt en public (pour Cloud Shell)
gh repo edit ateliernumerique37-tech/h2vl-connect --visibility public --accept-visibility-change-consequences

# Repasser en privé
gh repo edit ateliernumerique37-tech/h2vl-connect --visibility private --accept-visibility-change-consequences
```
