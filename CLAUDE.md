# H2VL Connect — Documentation projet pour Claude

## Vue d'ensemble

Application de gestion interne de l'association **H2VL** (Handicap Visuel Val de Loire).
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
- **URL de production** : `https://studio--studio-6079106449-cf583.us-central1.hosted.app`

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
| `POST /api/send-invitation` | Envoi d'une invitation individuelle avec lien d'auto-inscription | Non (usage interne uniquement) |
| `POST /api/queue-invitations` | Crée la file d'attente d'invitations en batch (sans envoyer) | Bearer token admin |
| `POST /api/process-invitation-queue` | Traite la file d'attente avec 800ms entre chaque email | Bearer token admin |
| `POST /api/confirm-inscription` | Valide une inscription via lien d'invitation (Admin SDK) | Non (jeton secret) |
| `POST /api/create-annulation-token` | Crée un jeton d'annulation pour une inscription admin manuelle (Admin SDK) | Non (appelé côté serveur) |
| `POST /api/cancel-inscription` | Annule une inscription via jeton d'annulation (Admin SDK) | Non (jeton secret) |
| `POST /api/create-admin` | Crée un compte Firebase Auth + doc Firestore admins | Bearer token admin |
| `POST /api/delete-admin` | Supprime un admin (Auth + Firestore), protège le dernier admin | Bearer token admin |
| `POST /api/update-admin-password` | Change le mot de passe d'un admin (Admin SDK) | Bearer token admin |
| `POST /api/cron/anniversaires` | Envoi automatique des emails d'anniversaire | Header `x-cron-secret` |
| `POST /api/cron/date-limite` | Envoie la liste des inscrits quand la date limite d'inscription est atteinte | Header `x-cron-secret` |
| `POST /api/confirm-read` | Obsolète — retourne 410 | — |

---

## Collections Firestore

| Collection | Description | Règles |
|---|---|---|
| `admins/{uid}` | Profils admins — l'ID doc = UID Firebase Auth | `get` : owner ou admin. `list` : admin. `create/delete` : `false` (Admin SDK uniquement). `update` : admin |
| `adherents/{id}` | Membres de l'association | Lecture : admin. Écriture : Administrateur uniquement (RGPD) |
| `evenements/{id}` | Événements | **Lecture : publique** (`allow read: if true`). Écriture : admin |
| `inscriptions/{id}` | Inscriptions aux événements | Lecture : connecté. Écriture : admin |
| `cotisations/{id}` | Cotisations annuelles | Lecture/écriture : Administrateur uniquement |
| `email_campaigns/{id}` | Campagnes e-mail envoyées | Admin uniquement |
| `email_tracking/{jeton}` | Suivi des accusés de réception | **Public** (lecture/écriture) |
| `invitations_evenement/{jeton}` | Invitations événement avec lien auto-inscription | **Lecture publique**, écriture : `false` (Admin SDK uniquement) |
| `queue_invitations/{id}` | File d'attente d'envoi des invitations | Lecture : admin. Écriture : `false` (Admin SDK uniquement) |
| `annulations_inscription/{jeton}` | Jetons d'annulation d'inscription | **Lecture publique**, écriture : `false` (Admin SDK uniquement) |
| `logs_anniversaires/{id}` | Historique envois e-mail anniversaire | Admin uniquement |
| `logs_liste_inscrits/{id}` | Anti-doublon pour le cron date-limite | Admin uniquement |
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

### Structure clé : `queue_invitations/{id}`
```json
{
  "evenementId": "...",
  "jeton": "UUID",
  "adherentId": "...",
  "adherentEmail": "...",
  "adherentFirstName": "...",
  "inscriptionUrl": "https://...lien/inscription-invitation/[jeton]",
  "eventTitle": "...",
  "eventDate": "chaîne formatée fr-FR",
  "eventDateFin": "chaîne formatée fr-FR | null",
  "eventLocation": "...",
  "eventPrix": 0,
  "eventDescription": "...",
  "necessiteMenu": false,
  "estSortieBowling": false,
  "statut": "en_attente | en_cours | envoyé | erreur",
  "erreur": "null | message d'erreur",
  "createdAt": "ISO string",
  "sentAt": "ISO string | null"
}
```

> Le statut `en_cours` est utilisé comme verrou anti-race-condition : le serveur marque tous les items `en_cours` en batch avant de commencer l'envoi. Tout appel concurrent trouvera 0 items `en_attente` et s'arrêtera immédiatement. En cas de retry (`retryErrors: true`), les items `en_cours` et `erreur` sont remis à `en_attente` (récupération après run interrompu).

### Structure clé : `annulations_inscription/{jeton}`
```json
{
  "inscriptionId": "...",
  "evenementId": "...",
  "eventTitle": "...",
  "jetonInvitation": "UUID | null",
  "utilisé": false,
  "createdAt": "ISO string",
  "dateAnnulation": "ISO string (après usage)"
}
```

> `jetonInvitation` est renseigné quand l'inscription vient d'un lien d'invitation. Permet à `/api/cancel-inscription` de remettre l'invitation à `statut: 'envoyé'` après annulation, rendant le lien réutilisable.

---

## Types TypeScript (`src/lib/types.ts`)

```typescript
Adherent            // Membre de l'association
Evenement           // Événement (avec necessiteMenu?, optionsMenu?, estSortieBowling?)
Inscription         // Inscription à un événement (avec choixMenu?, choixBowling?)
Cotisation          // Cotisation annuelle
Admin               // Compte administrateur
LogAdmin            // Log d'action admin
LogAnniversaire
CampagneEmail
EmailTracking
InvitationEvenement
QueueInvitation     // Item de file d'attente d'invitation — statut: en_attente | en_cours | envoyé | erreur
```

### Champs attendus `Adherent` (13 champs)

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `prenom` | string | ✅ | |
| `nom` | string | ✅ | En majuscules par convention |
| `email` | string | ✅ | Peut être vide si inconnu |
| `telephone` | string | ✅ | Peut être vide si inconnu |
| `adresse` | string | ✅ | Peut être vide si inconnue |
| `dateNaissance` | string | ✅ | Format `YYYY-MM-DD`. Vide si non renseignée (fréquent) |
| `genre` | string | ✅ | `'H'` ou `'F'` |
| `dateInscription` | string | ✅ | ISO string |
| `estMembreBureau` | boolean | ✅ | |
| `estBenevole` | boolean | ✅ | |
| `estMembreFaaf` | boolean | ✅ | Cotisation FAAF → 40 € au lieu de 15 € |
| `accordeDroitImage` | boolean | ✅ | |
| `cotisationAJour` | boolean | ✅ | |

> `dateNaissance` est souvent vide pour les anciens adhérents — ce n'est pas bloquant pour le fonctionnement de l'application.

### Champs spéciaux `Evenement`
- `necessiteMenu?: boolean` — active le choix de menu à l'inscription
- `optionsMenu?: { aperitifs?, entrees?, plats?, fromages?, desserts? }` — listes d'options
- `estSortieBowling?: boolean` — active les options bowling à l'inscription
- `dateFin?: string` — ISO string, optionnel. Utiliser `deleteField()` pour le supprimer via `updateDoc`
- `dateLimiteInscription?: string` — ISO string, optionnel. Idem

### Champs spéciaux `Inscription`
- `choixMenu?: { aperitifChoisi?, entreeChoisie?, platChoisi?, fromageChoisi?, dessertChoisi? }`
- `choixBowling?: { avecBarrieres?, sansBarrieres?, prendGouter? }`

> ⚠️ Pour supprimer un champ optionnel via `updateDoc`, toujours utiliser `deleteField()` de `firebase/firestore` — jamais `undefined` (Firestore le rejette).

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
`isLoading` est initialisé à `true` si la ref est non-null : `useState<boolean>(() => memoizedDocRef != null)`.
Sans ce fix, `notFound()` se déclenche avant le premier snapshot Firestore.

### Bug connu — transition de ref dans le layout (corrigé)
Dans `AuthGuard` (`dashboard/layout.tsx`), quand `adminRef` passe de `null` à une ref réelle, il y a une frame de rendu où `isAdminDocLoading = false` et `adminDoc = null` simultanément (le `useEffect` de `useDoc` n'a pas encore tourné).

**Fix** : un `useRef` (`prevAdminRefPath`) détecte ce changement et étend l'état de chargement pour couvrir cette frame :
```typescript
const prevAdminRefPath = useRef<string | undefined>(undefined);
const adminRefInTransition = prevAdminRefPath.current !== adminRef?.path;
prevAdminRefPath.current = adminRef?.path;
const isEffectivelyLoading = isAdminDocLoading || adminRefInTransition;
```

> ⚠️ Ne jamais rétablir la logique de "healing" (`setDoc` avec `{ merge: true }`) dans `AuthGuard`. Elle causait une corruption des données admin (prenom/nom/role écrasés) à chaque rechargement de session. L'écriture côté client est de toute façon bloquée par `allow create: if false`.

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

| Variable | Description |
|---|---|
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `465` |
| `EMAIL_USER` | Adresse Gmail expéditrice |
| `EMAIL_PASS` | Mot de passe d'application Gmail (16 caractères) |
| `EMAIL_FROM_NAME` | Nom affiché dans les emails |
| `CRON_SECRET` | Secret partagé entre GCP Cloud Scheduler et les routes `/api/cron/*` |

> ⚠️ Les valeurs réelles ne doivent **jamais** être écrites dans ce fichier (versionné Git). Les retrouver dans `apphosting.yaml` (production) et `.env.local` (développement local, gitignored).

En développement local, créer un fichier `.env.local` à la racine avec ces variables.

Le `timeoutSeconds: 300` dans `runConfig` de `apphosting.yaml` permet à `/api/process-invitation-queue` de tourner jusqu'à 5 minutes sans être coupé par Cloud Run. Sur Cloud Run, c'est ce paramètre qui fait foi — le `export const maxDuration` dans le code Next.js n'a pas d'effet sur Firebase App Hosting (c'est une directive Vercel uniquement).

---

## Déploiement

### Application (automatique)
Firebase App Hosting est connecté au dépôt GitHub.
**Chaque push sur `main` déclenche automatiquement un build et un déploiement** de l'application Next.js.

### Règles et indexes Firestore (via plugin MCP Firebase)
Les règles et indexes Firestore ne se déploient **pas** automatiquement avec l'application.
À chaque modification de `firestore.rules` ou `firestore.indexes.json`, utiliser le **plugin MCP Firebase** :

```
1. firebase_validate_security_rules (type: firestore, source_file: firestore.rules)
2. firebase_deploy (only: firestore)
3. firebase_deploy_status (jobId: ...)
```

En alternative, depuis Cloud Shell :
```bash
cd h2vl-connect && git pull
firebase deploy --only firestore --project studio-6079106449-cf583
```

### Accès public Cloud Run (à faire une seule fois, persiste)
```bash
gcloud run services add-iam-policy-binding studio \
  --region us-central1 \
  --project studio-6079106449-cf583 \
  --member allUsers \
  --role roles/run.invoker
```

---

## E-mails

### File d'attente invitations (anti-throttling Gmail)

L'envoi en masse d'invitations (jusqu'à 92 adhérents) utilisait une boucle directe qui provoquait des blocages Gmail. Le système utilise maintenant une file d'attente Firestore :

1. `POST /api/queue-invitations` — crée tous les docs `invitations_evenement` + `queue_invitations` en batch Firestore. Retourne immédiatement. Requiert un Bearer token Firebase Auth.
2. `POST /api/process-invitation-queue` — lu par le frontend en fire-and-forget (pas d'`await`). Marque d'abord tous les items `en_cours` (verrou anti-race-condition), puis envoie les emails un par un avec 800ms de pause. Requiert un Bearer token Firebase Auth.
3. Le frontend suit la progression en temps réel via `useCollection` sur `queue_invitations` filtré par `evenementId`.
4. Si des emails échouent (`statut: erreur`), un bouton "Réessayer" appelle process-invitation-queue avec `{ retryErrors: true }`, qui remet `erreur` + `en_cours` à `en_attente` avant de retraiter.

**Batch Firestore** : le batch est découpé en chunks de 200 destinataires maximum (400 ops, sous la limite de 500 ops/batch Firestore).

**Nodemailer** : le `transporter` est créé une seule fois avant la boucle (réutilisation de la connexion SMTP) et fermé dans un bloc `finally` après traitement.

### API `POST /api/send-email`

Paramètres acceptés :
```typescript
{
  to: string,
  firstName: string,
  adherentId?: string,
  campaignId?: string,
  type?: 'birthday' | 'campaign',     // absent = confirmation d'inscription
  customMessage?: string,              // pour birthday
  subject?: string,
  eventTitle?: string,
  eventDate?: string,
  eventDateFin?: string,
  eventLocation?: string,
  eventPrix?: number,
  campaignSubject?: string,
  campaignBody?: string,
  menuChoices?: Record<string, string>,    // choix de menu à afficher
  bowlingChoices?: Record<string, boolean>, // options bowling à afficher
  annulationUrl?: string,              // lien d'annulation à inclure
}
```

### API `POST /api/send-invitation`

Paramètres acceptés :
```typescript
{
  to: string,
  firstName: string,
  adherentId: string,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventDateFin?: string,
  eventLocation: string,
  eventPrix: number,
  necessiteMenu: boolean,
  estSortieBowling: boolean,
}
```

> ⚠️ `/api/send-invitation` envoie un seul email à la fois et n'est plus utilisé pour les envois en masse depuis le dashboard. Le flux en masse passe désormais par `/api/queue-invitations` + `/api/process-invitation-queue`.

### Envoi de mails en masse via script (hors interface)

```python
import urllib.request, json, time

API_URL = "https://studio--studio-6079106449-cf583.us-central1.hosted.app/api/send-email"

recipients = [
    ("Prénom", "email@example.com"),
]

for prenom, email in recipients:
    payload = json.dumps({
        "to": email,
        "firstName": prenom,
        "type": "campaign",
        "campaignSubject": "Sujet du mail",
        "campaignBody": "Corps du mail en texte simple."
    }).encode("utf-8")
    req = urllib.request.Request(API_URL, data=payload,
          headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        pass
    time.sleep(0.8)
```

> Si deux adhérents partagent le même email (ex. : couple), n'envoyer qu'une seule fois à cette adresse.

### Design des templates

Tous les emails partagent la même structure :
- Header coloré avec **H2VL** / *Handicap Visuel Val de Loire* en texte (pas d'image)
- Contenu en texte simple avec listes à puces (pas de tableaux HTML)
- Footer sobre avec nom de l'association
- Couleur header : bleu (`#1A75D1`) pour invitation/anniversaire/campagne, vert (`#15803d`) pour confirmation d'inscription

Le bouton de tracking s'appelle **"J'ai bien reçu cet e-mail ✓"** (anciennement "Accuser réception").

### Tracking e-mail
Chaque e-mail contient un bouton vers `/lien/confirmation/[jeton]`.
Le jeton est stocké dans `email_tracking/{jeton}` avec `statut: 'envoyé'`.
Quand l'utilisateur clique, le statut passe à `confirmé` et `dateLecture` est renseignée.

### Fuseau horaire dans les emails
**⚠️ Règle critique** : les emails générés côté serveur (Cloud Run = UTC) doivent toujours spécifier `timeZone: 'Europe/Paris'` dans `toLocaleDateString`. Sans ça, les heures affichées dans les emails sont décalées de 2h en été (UTC+2).

```typescript
const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris', // OBLIGATOIRE côté serveur
});
```

Les pages client (dashboard) n'ont pas ce problème car le navigateur de l'admin est en heure de Paris.

> ⚠️ Appliquer `timeZone: 'Europe/Paris'` dans **tous** les formateurs de date inclus dans un email, même côté client. Cela garantit la cohérence si le code migre un jour côté serveur.

### Lien d'annulation d'inscription
Chaque e-mail de confirmation contient un lien vers `/lien/annulation/[jeton]`.
Le jeton est stocké dans `annulations_inscription/{jeton}` via Admin SDK (`/api/create-annulation-token`).
L'annulation appelle `POST /api/cancel-inscription` (Admin SDK) qui :
1. Supprime l'inscription Firestore
2. Marque le jeton comme utilisé
3. Remet l'invitation à `statut: 'envoyé'` si `jetonInvitation` est renseigné (lien d'invitation réutilisable)

---

## Gestion des administrateurs

- La page `/signup` est désactivée (redirige vers `/login`)
- Les admins se créent **uniquement depuis le dashboard** → `/dashboard/admin`
- Le formulaire de création/édition utilise un **RadioGroup** pour le choix du rôle (pas un Select — conflit avec le focus trap du Dialog Radix)
- La création passe par `POST /api/create-admin` (Admin SDK) :
  1. Vérifie le Bearer token du demandeur
  2. Crée le compte Firebase Auth avec `createUser()`
  3. Crée le doc Firestore `admins/{uid}` avec l'UID comme ID de document
- La suppression passe par `POST /api/delete-admin` (Admin SDK) :
  1. Vérifie qu'il reste au moins 1 admin
  2. Supprime le compte Firebase Auth
  3. Supprime le doc Firestore
- Le changement de mot de passe passe par `POST /api/update-admin-password` (Admin SDK, Bearer token)
- Mot de passe oublié → `/forgot-password` via `sendPasswordResetEmail` Firebase Auth
- **Règle importante** : `isAdmin()` vérifie `exists(/admins/{request.auth.uid})` — l'ID du doc doit être l'UID Firebase Auth

---

## Fonctionnalités événements

### Menu restaurant
- Activé via le switch **"Cet événement nécessite un choix de menu"** à la création/édition
- Options définies par l'admin (champ texte, valeurs séparées par virgules)
- À l'inscription → RadioGroup par catégorie (Apéritif, Entrée, Plat, Fromage, Dessert)
- Les choix s'affichent dans la liste des inscrits, dans l'export CSV et dans l'e-mail de confirmation
- **Les choix de menu et bowling sont obligatoires** pour valider une inscription si l'événement les requiert. Le bouton de confirmation reste désactivé tant que tous les choix ne sont pas faits (validé côté client dans `RegisterMemberDialog` et dans la page publique `/lien/inscription-invitation/[jeton]`).

### Sortie bowling
- Activé via le switch **"C'est une sortie bowling"** à la création/édition
- À l'inscription → 3 cases à cocher :
  - **Avec barrières** (s'exclut mutuellement avec "Sans barrières")
  - **Sans barrières** (s'exclut mutuellement avec "Avec barrières")
  - **Prend le goûter de l'amitié**
- Les choix s'affichent dans la liste des inscrits, dans l'export CSV et dans l'e-mail de confirmation

### Cron anniversaires
- Job Cloud Scheduler GCP : `0 8 * * *` Europe/Paris → POST `https://studio--studio-6079106449-cf583.us-central1.hosted.app/api/cron/anniversaires`
- Header requis : `x-cron-secret: h2vl-cron-bK7mNpQ3rJ9sX1tZ5vE8wA4dC6fH2gL0`
- Le cron appelle `/api/send-email` (pas Nodemailer directement) → tracking email complet inclus
- Anti-doublons via `logs_anniversaires` (champ `date_envoi: YYYY-MM-DD`)
- **Ne jamais envoyer via Nodemailer directement dans le cron** — toujours passer par `/api/send-email`

### Cron date limite d'inscription
- Job Cloud Scheduler GCP → POST `.../api/cron/date-limite`
- Header requis : `x-cron-secret`
- Envoie la liste des inscrits à `contact.h2vl@gmail.com` le jour où la date limite est atteinte
- Anti-doublons via `logs_liste_inscrits/{evenementId}` (champ `date_envoi: YYYY-MM-DD`)

### Cotisations
- `addCotisationForYear(db, adherentId, annee, isFaaf)` — montant : 40 € FAAF / 15 € sinon
- `deleteCotisationForYear(db, adherentId, annee)` — met à jour `cotisationAJour` uniquement si `annee === currentYear`
- Historique affiché depuis 2022 (`FIRST_YEAR = 2022`)
- `addCotisation` / `removeCotisation` sont des aliases conservés pour compatibilité

### Page Statistiques (`/dashboard/stats`)

La page stats n'utilise **pas** de graphiques (recharts a été supprimé). Elle affiche 4 blocs de texte narratif :
1. **Vue d'ensemble des membres** — genre, âge moyen, cotisations à jour
2. **Profil de la base** — FAAF, droit image, bureau, bénévoles, simples, tranches d'âge
3. **Activité événements** — nombre d'événements, inscriptions, recettes, top événements
4. **Participation individuelle** — % ayant participé à 1+, 2+, 3+ événements dans l'année

Helper `pct(n, total)` utilisé pour les pourcentages. Année sélectionnable via un `Select`.

### Maintenance de la base adhérents

Pour des opérations de masse sur les adhérents (import, audit, corrections) :
- Utiliser le **plugin Firestore MCP** (`firestore_list_documents`, `firestore_update_document`, `firestore_add_document`, `firestore_delete_document`)
- Pour lire des fichiers `.xlsx`, utiliser **Python + openpyxl** (`pip install openpyxl`)
- Pour croiser des données Excel avec Firestore, utiliser `unicodedata.normalize('NFD', s)` pour gérer les accents lors des comparaisons de noms

Opérations réalisées en avril 2026 :
- Import de 11 nouveaux adhérents depuis `membre 2026.xlsx`
- Mise à jour `cotisationAJour=true` pour 63 adhérents depuis `cotisations 2026.xlsx`
- Suppression de 3 adhérents (Nicole ABDELATIF, Sonia LEMERLE, Philippe PEROLLE)
- Fusion Sophie PASCAL → Pascal BERNIER (mise à jour du document existant)
- Audit exhaustif des 13 champs sur 92 adhérents
- Campagne e-mail de relance date de naissance (39 destinataires uniques)

### Sauvegardes Firestore
- Managed Backups hebdomadaires activées → Google Cloud Storage
- Point-in-time recovery (PITR) activé — restauration possible jusqu'à 7 jours en arrière

### Invitation par lien (nouveau flux avec file d'attente)
1. L'admin sélectionne les adhérents non inscrits et clique "Envoyer"
2. `POST /api/queue-invitations` crée tous les docs `invitations_evenement` (jetons) et `queue_invitations` en batch → retour immédiat
3. `POST /api/process-invitation-queue` est lancé en fire-and-forget (pas d'`await` côté frontend)
4. Le serveur marque tous les items `en_cours` (verrou), puis envoie les emails avec 800ms de pause
5. Le frontend affiche la progression en temps réel via `useCollection` sur `queue_invitations`
6. Si des items échouent → bouton "Réessayer" → `retryErrors: true` → reset + retraitement
7. La page publique `/lien/inscription-invitation/[jeton]` fonctionne comme avant (inchangée)
8. Si menu ou bowling → choix obligatoires avant confirmation
9. `/api/confirm-inscription` crée l'inscription + jeton d'annulation
10. Si l'adhérent annule → l'invitation repasse à `statut: 'envoyé'` → lien réutilisable

### Inscription manuelle (par un admin depuis le dashboard)
1. L'admin utilise le dialog "Inscrire un adhérent" sur la page de détail de l'événement
2. `addInscription` utilise le client SDK (les admins ont `allow write` sur `inscriptions`)
3. Le jeton d'annulation est créé via `/api/create-annulation-token` (Admin SDK) car `annulations_inscription` a `allow write: if false`
4. En cas d'échec de l'API, un toast d'avertissement s'affiche mais l'inscription est quand même validée
5. L'e-mail de confirmation est envoyé via `/api/send-email`

---

## Sécurité — points importants

- **Les routes `/lien/*` sont exclues du Service Worker PWA** (`navigateFallbackDenylist: [/^\/lien/]`) pour éviter que le SW intercepte les liens d'e-mail
- **Firebase Hosting intercepte `/public/*`** → toutes les routes publiques dynamiques sont sous `/lien/`
- **`allow create: if false`** sur `admins` → impossible de créer un admin depuis le client → Admin SDK obligatoire
- **`allow write: if false`** sur `invitations_evenement`, `annulations_inscription` et `queue_invitations` → toutes les écritures passent par des routes API avec Admin SDK
- **`annulationUrl`** utilise un UUID unique par inscription → non-devinable, à usage unique
- **`evenements` est en lecture publique** (`allow read: if true`) — nécessaire pour que la page d'invitation publique puisse lire les détails de l'événement (choix de menu, bowling)
- **Toute API route qui déclenche un effet de bord (envoi d'email, écriture Firestore sensible) doit être authentifiée** via Bearer token Firebase Auth (`adminAuth().verifyIdToken(token)`). Pattern :

```typescript
const token = request.headers.get('authorization')?.replace('Bearer ', '');
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
await adminAuth().verifyIdToken(token);
```

Côté frontend :
```typescript
const token = await auth.currentUser?.getIdToken();
fetch('/api/ma-route', {
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  ...
});
```

---

## Structure des fichiers clés

```
├── apphosting.yaml              # Config Firebase App Hosting (env vars, Cloud Run, timeoutSeconds)
├── firebase.json                # Config Firebase (firestore rules/indexes)
├── firestore.rules              # Règles de sécurité Firestore
├── firestore.indexes.json       # Index composites Firestore
├── next.config.ts               # Config Next.js + PWA
├── src/
│   ├── app/
│   │   ├── (auth)/              # Pages login / forgot-password / signup
│   │   ├── api/
│   │   │   ├── send-email/            # Envoi e-mail (confirmation, anniversaire, campagne)
│   │   │   ├── send-invitation/       # Envoi invitation individuelle (usage interne)
│   │   │   ├── queue-invitations/     # Création batch de la file d'attente (Bearer token)
│   │   │   ├── process-invitation-queue/ # Traitement séquentiel de la file (Bearer token)
│   │   │   ├── confirm-inscription/   # Validation inscription via lien (Admin SDK)
│   │   │   ├── create-annulation-token/ # Jeton d'annulation pour inscription manuelle (Admin SDK)
│   │   │   ├── cancel-inscription/    # Annulation inscription (Admin SDK)
│   │   │   ├── create-admin/          # Création admin (Admin SDK)
│   │   │   ├── delete-admin/          # Suppression admin (Admin SDK)
│   │   │   ├── update-admin-password/ # Changement mot de passe (Admin SDK)
│   │   │   └── cron/
│   │   │       ├── anniversaires/     # Cron anniversaires (x-cron-secret)
│   │   │       └── date-limite/       # Cron liste inscrits à date limite (x-cron-secret)
│   │   ├── dashboard/           # Pages du tableau de bord (protégées)
│   │   │   └── layout.tsx       # AuthGuard : gestion auth + rôle + protection race condition
│   │   ├── lien/                # Pages publiques accessibles par lien e-mail
│   │   │   ├── confirmation/    # Accusé de réception e-mail
│   │   │   ├── inscription-invitation/ # Auto-inscription par invitation
│   │   │   └── annulation/      # Annulation d'inscription
│   │   └── error.tsx            # Error boundary global
│   ├── components/
│   │   ├── ui/                  # Composants shadcn/ui
│   │   ├── admin/
│   │   │   ├── admin-form.tsx   # Formulaire admin — RadioGroup pour le rôle (pas Select)
│   │   │   └── admin-table.tsx
│   │   ├── FirebaseErrorListener.tsx
│   │   ├── adherent-card.tsx
│   │   └── event-card.tsx
│   ├── contexts/
│   │   └── admin-role-context.tsx  # Contexte RBAC (Administrateur | Modérateur)
│   ├── firebase/                # Hooks et initialisation Firebase client
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── provider.tsx
│   │   └── firestore/
│   │       ├── use-doc.tsx      # isLoading initialisé à true si ref non-null
│   │       └── use-collection.tsx
│   ├── lib/
│   │   ├── types.ts
│   │   ├── firebase-admin.ts    # adminAuth, adminDb
│   │   └── utils.ts
│   └── services/
│       ├── adminsService.ts
│       ├── adherentsService.ts
│       ├── evenementsService.ts # updateEvenement accepte Record<string, unknown> pour deleteField()
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
- Accessibilité : WCAG 2.2 — `aria-label`, `role`, `aria-live` sur tous les éléments interactifs
- **Ne jamais mettre `aria-label` sur un `<Link>` qui contient du texte** : l'aria-label écrase tout le contenu intérieur pour NVDA/JAWS. Utiliser des `<h2>` par item et des détails en dessous.
- **WCAG 2.5.3** : ne pas mettre un `aria-label` sur un bouton dont le texte visible est déjà descriptif (ex. : bouton "Créer un événement" ne doit pas avoir `aria-label="Créer un nouvel événement"`).
- `export const dynamic = 'force-dynamic'` sur toutes les pages publiques avec paramètres dynamiques
- Pour les champs Firestore optionnels (`dateFin`, `dateLimiteInscription`) : utiliser `deleteField()` de `firebase/firestore` lors de la suppression, jamais `undefined`

---

## Règles de développement — erreurs à ne jamais reproduire

Ces règles sont issues de bugs réels détectés en code review sur ce projet. Les appliquer systématiquement dès l'écriture du code, sans attendre la review.

### 1. Authentifier toute API route qui a des effets de bord

Toute route API qui envoie des emails, modifie Firestore ou déclenche une action sensible **doit** vérifier un Bearer token Firebase Auth. Une route non authentifiée peut être appelée par n'importe qui depuis Internet qui connaît l'URL.

**Pattern d'auth implémenté sur `/api/send-email`** (accepte Bearer token OU x-cron-secret) :
```typescript
const cronSecret = request.headers.get('x-cron-secret');
const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');
if (cronSecret) {
  if (cronSecret !== process.env.CRON_SECRET)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
} else if (bearerToken) {
  try { await adminAuth().verifyIdToken(bearerToken); }
  catch { return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); }
} else {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
```

**Exceptions admises** : routes protégées par un jeton UUID non-devinable (`/api/confirm-inscription`, `/api/cancel-inscription`) et routes cron protégées par `x-cron-secret`.

**Routes actuellement sécurisées :**
- Bearer token : `send-email`, `create-annulation-token`, `queue-invitations`, `process-invitation-queue`, `create-admin`, `delete-admin`, `update-admin-password`
- `x-cron-secret` : `cron/anniversaires`, `cron/date-limite`
- UUID non-devinable : `confirm-inscription`, `cancel-inscription`
- Obsolète (410) : `send-invitation`, `confirm-read`

**Côté dashboard**, toujours récupérer le token dans la boucle d'envoi (Firebase le cache, refresh auto si proche expiry) :
```typescript
const token = await auth.currentUser?.getIdToken(); // dans la boucle, pas avant
```

**`/api/confirm-inscription`** envoie directement l'email de confirmation via Nodemailer (plus de délégation à `/api/send-email` depuis la page publique). Inclut le tracking `email_tracking` et le bouton "J'ai bien reçu cet e-mail ✓". L'email est best-effort : l'inscription reste valide même si l'envoi échoue.

### 2. Pattern anti-race-condition pour les traitements par lot

Quand un endpoint traite une liste d'items en base (ex. : file d'attente), il faut **les réclamer atomiquement avant de commencer**, pour qu'un appel concurrent ne traite pas les mêmes items en double.

Pattern à utiliser systématiquement :

```typescript
// 1. Lire les items en attente
const pendingSnap = await db.collection('ma_collection')
  .where('statut', '==', 'en_attente').get();

// 2. Les marquer "en_cours" immédiatement en batch (verrou)
const claimBatch = db.batch();
pendingSnap.docs.forEach(doc => claimBatch.update(doc.ref, { statut: 'en_cours' }));
await claimBatch.commit();

// 3. Seulement maintenant, traiter les docs capturés
for (const doc of pendingSnap.docs) { ... }
```

Un deuxième appel concurrent arrivant après le `claimBatch.commit()` ne trouvera plus rien à traiter.

### 3. Limite de 500 opérations par batch Firestore

Un seul `db.batch()` accepte au maximum **500 opérations** (set, update, delete confondus). Si le code crée plusieurs docs par entrée (ex. : 2 docs par destinataire = 400 ops pour 200 destinataires), découper en chunks :

```typescript
const CHUNK_SIZE = 200; // 200 destinataires × 2 docs = 400 ops, sous la limite
for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
  const batch = db.batch();
  for (const item of recipients.slice(i, i + CHUNK_SIZE)) {
    batch.set(...);
    batch.set(...);
  }
  await batch.commit();
}
```

### 4. Fermer le transporter Nodemailer après usage

`nodemailer.createTransport()` maintient un pool de connexions TCP ouvertes. Sur Cloud Run (serverless avec instances réutilisées), ces connexions peuvent s'accumuler. Toujours appeler `transporter.close()` dans un bloc `finally` :

```typescript
const transporter = nodemailer.createTransport({ ... });
try {
  for (const item of items) {
    await transporter.sendMail({ ... });
  }
} finally {
  transporter.close();
}
```

### 5. Protéger les divisions dans les useMemo

Un `useMemo` qui calcule un ratio (ex. : pour une barre de progression) peut provoquer une division par zéro si le total est 0. Toujours retourner `null` ou une valeur de guard quand la collection est vide :

```typescript
const stats = useMemo(() => {
  if (!items || items.length === 0) return null; // guard obligatoire
  return {
    total: items.length,
    ratio: items.filter(...).length / items.length, // sûr car total > 0
  };
}, [items]);
```

### 6. Ne pas afficher d'état UI persistant entre les sessions

Quand un bloc de progression ou de statut est alimenté par une collection Firestore, il restera visible lors des visites futures si les données persistent. Il faut conditionner l'affichage à un état **actif** (traitement en cours ou erreurs), pas à la simple présence de données historiques.

```typescript
// ❌ Mauvais : affiche toujours si des données existent
if (queueItems.length > 0) return { ... };

// ✅ Bon : n'affiche que si quelque chose requiert l'attention
const pending = items.filter(i => i.statut === 'en_attente' || i.statut === 'en_cours').length;
const error = items.filter(i => i.statut === 'erreur').length;
if (pending === 0 && error === 0) return null; // rien à montrer
```

### 7. Positionner les pauses dans les boucles (avant, pas après)

Dans une boucle d'envoi avec throttling, la pause doit être **avant** chaque itération sauf la première, pour ne pas attendre inutilement après le dernier traitement :

```typescript
for (let i = 0; i < items.length; i++) {
  if (i > 0) await sleep(800); // pause avant, sauf premier
  await process(items[i]);
}
```

### 9. Pattern de sélection unique par checkbox (shadcn/ui)

Pour toute liste de sélection à choix unique (ex. : `RegisterMemberDialog`, section invitation), utiliser ce pattern :
- `checked={selectedId === item.id}` sur le `<Checkbox>`
- `onClick={() => setSelectedId(prev => prev === item.id ? "" : item.id)}` sur le `<div>` wrapper
- `onClick={e => e.stopPropagation()}` sur le `<Checkbox>` pour éviter le double déclenchement
- `<div aria-live="polite" className="sr-only">` pour annoncer le nombre de résultats en temps réel (NVDA/JAWS)

Ce pattern est identique dans `RegisterMemberDialog` et la section invitations de `/dashboard/events/[id]/page.tsx`.

### 8. `maxDuration` n'a pas d'effet sur Firebase App Hosting

`export const maxDuration = 300` est une directive **Vercel uniquement**. Sur Firebase App Hosting (Cloud Run), le timeout est contrôlé exclusivement par `timeoutSeconds` dans `apphosting.yaml`. Il faut configurer les deux pour être cohérent, mais savoir que seul `apphosting.yaml` a un effet réel en production.

---

## Processus de développement

**Règle de push** : ne jamais pusher sans confirmation explicite de l'utilisateur que la fonctionnalité fonctionne. Rappeler à l'utilisateur de confirmer avant de pusher après chaque feature complète.

**Après chaque session de code**, lancer systématiquement l'agent `feature-dev:code-reviewer` pour vérifier les fichiers modifiés avant de commit. Cet agent a détecté des problèmes critiques (race condition, endpoints non authentifiés) que la première version du code contenait.

Le prompt type pour la review :

```
Effectue une code review sur les fichiers suivants récemment modifiés.
Recherche : bugs, race conditions, problèmes de sécurité (endpoints non authentifiés),
limites de plateforme dépassées, fuites de ressources, états UI incohérents.
Ne rapporte que les problèmes réels à haute confiance. Pas de suggestions de style.
Fichiers : [liste des fichiers modifiés]
```

---

## Rôles et contrôle d'accès (RBAC)

### Rôles disponibles

- `Administrateur` — accès complet
- `Modérateur` — accès restreint (sans accès aux données adhérents, RGPD)

### Permissions par rôle

| Section | Administrateur | Modérateur |
|---|---|---|
| Tableau de bord | ✅ Complet | ✅ Complet |
| Événements | ✅ Complet | ✅ Complet |
| Communication | ✅ Complet | ✅ Complet |
| Statistiques | ✅ Complet | ✅ Complet |
| Adhérents (liste, fiche, création) | ✅ Complet | ❌ Bloqué (RGPD) |
| Admin — autres comptes + logs | ✅ Complet | ❌ Caché |
| Admin — son propre compte | ✅ | ✅ |

### Architecture technique RBAC
- `AdminRoleContext` expose le rôle via `useAdminRole()`
- `AdminRoleProvider` est injecté dans `dashboard/layout.tsx` — lit le champ `role` du doc Firestore `admins/{uid}`
- La sidebar masque l'item Adhérents pour les Modérateurs
- Les règles Firestore bloquent l'écriture sur `adherents` et `cotisations` si le rôle n'est pas `Administrateur`

> ⚠️ Après toute modification de `firestore.rules` → déployer via plugin MCP Firebase ou Cloud Shell

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
