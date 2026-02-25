# Statut de l'Application H2vl Connect

Ce document résume l'état actuel de l'application de gestion pour l'association H2vl.

## 1. Arborescence des Dossiers (Navigation)

L'application utilise Next.js avec l'App Router. La structure de navigation principale se trouve dans `src/app/dashboard` et est organisée comme suit :

- `/dashboard`: Page d'accueil (Tableau de Bord)
- `/dashboard/adherents`: Page listant tous les adhérents.
  - `/dashboard/adherents/[id]`: Page de détail pour un adhérent spécifique.
- `/dashboard/events`: Page listant tous les événements.
  - `/dashboard/events/create`: Page pour créer un nouvel événement.
  - `/dashboard/events/[id]`: Page de détail pour un événement spécifique.
  - `/dashboard/events/[id]/edit`: Page pour modifier un événement.
- `/dashboard/stats`: Page affichant les statistiques de l'association.
- `/dashboard/admin`: Page d'administration.

La navigation est gérée par une barre latérale définie dans `src/components/dashboard/sidebar-nav.tsx`.

## 2. Définition des Modèles de Données (Interfaces TypeScript)

Les interfaces sont définies dans `src/lib/types.ts`.

### Adherent
```typescript
export interface Adherent {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  dateNaissance: string; // ISO string
  genre: 'H' | 'F' | 'Autre';
  dateInscription: string; // ISO string
  estMembreBureau: boolean;
  estBenevole: boolean;
  estMembreFaaf: boolean;
  accordeDroitImage: boolean;
  cotisationAJour: boolean;
}
```

### Evenement
```typescript
export interface Evenement {
  id: string;
  titre: string;
  description: string;
  date: string; // ISO string format
  lieu: string;
  prix: number;
  imageId: string;
  necessiteMenu?: boolean;
  optionsMenu?: {
    aperitifs?: string[];
    entrees?: string[];
    plats?: string[];
    fromages?: string[];
    desserts?: string[];
  };
}
```

### Inscription
```typescript
export interface Inscription {
  id: string;
  id_evenement: string;
  id_adherent: string;
  a_paye: boolean;
  date_inscription: string; // ISO string format
  choixMenu?: {
    aperitifChoisi?: string;
    entreeChoisie?: string;
    platChoisi?: string;
    fromageChoisi?: string;
    dessertChoisi?: string;
  };
}
```

### Cotisation
```typescript
export interface Cotisation {
  id: string;
  adherentId: string;
  annee: number | string;
  datePaiement: string; // ISO string
  montant: number;
}
```

### Admin
```typescript
export interface Admin {
  id: string;
  nom: string;
  email: string;
  role?: string;
}
```

### LogAdmin
```typescript
export interface LogAdmin {
  id: string;
  nomAdmin: string;
  actionRealisee: string;
  dateAction: string; // ISO string
}
```

## 3. Liste des Écrans et Fonctionnalités

- **Tableau de Bord (`/dashboard`)**: Affiche les chiffres clés (total adhérents, cotisations à jour) et les anniversaires du jour.
- **Liste des Adhérents (`/dashboard/adherents`)**: Affiche tous les membres.
  - **Fonctionnalités**:
    - Barre de recherche globale.
    - Filtres multiples (genre, cotisation, statuts, âge).
    - Bouton "Ajouter un adhérent".
- **Fiche Adhérent (`/dashboard/adherents/[id]`)**: Affiche et permet de modifier les détails d'un adhérent.
  - **Fonctionnalités**:
    - Champs de formulaire pour les informations personnelles.
    - Interrupteurs (Switches) pour les statuts booléens.
    - Section pour voir et ajouter l'historique des cotisations (montant fixé à 15€).
    - Boutons pour enregistrer, et supprimer l'adhérent.
- **Liste des Événements (`/dashboard/events`)**: Affiche les événements.
  - **Fonctionnalités**:
    - Filtres pour "événements à venir" et "événements passés".
    - Filtre par année.
    - Bouton "Créer un événement".
- **Création/Modification d'Événement (`.../events/create`, `.../events/[id]/edit`)**: Formulaire pour gérer les événements.
  - **Fonctionnalités**:
    - Champs pour les détails de l'événement.
    - Option pour activer la gestion de menu (repas).
    - Si activé, champs pour définir les options de menu (apéritifs, entrées, etc.).
- **Détail d'un Événement (`/dashboard/events/[id]`)**: Affiche les détails d'un événement et gère les inscriptions.
  - **Fonctionnalités**:
    - Boutons pour modifier ou supprimer l'événement.
    - Bouton "Inscrire un adhérent" ouvrant une modale.
    - La modale permet de choisir un adhérent et, si nécessaire, de sélectionner son menu.
    - Liste des inscrits avec leur statut de paiement (modifiable via un Switch) et leur choix de menu.
- **Statistiques (`/dashboard/stats`)**: Affiche les données analytiques de l'association.
  - **Fonctionnalités**:
    - Filtre par année.
    - Cartes affichant la moyenne d'âge, les répartitions (genre, engagement), le bilan des événements.
    - Graphique de répartition par genre.
- **Admin (`/dashboard/admin`)**: Section réservée à la gestion de l'application.
  - **Fonctionnalités**:
    - Gestion des comptes administrateurs (ajouter, modifier, supprimer).
    - Journal d'audit affichant l'historique des actions.

## 4. Règle d'Or sur l'Accessibilité (WCAG 2.1 AA)

- **Pas de Menus Cachés**: Toutes les actions principales (Modifier, Supprimer) sont des boutons directement visibles. Les menus déroulants de type "kebab" sont proscrits pour les actions critiques.
- **Boutons Nominatifs**: Les `accessibilityLabel` des boutons d'action sont dynamiques et contextuels pour être explicites (ex: `Modifier l'adhérent Jean Dupont`).
- **Texte Brut pour les Données Visuelles**: Tout graphique ou visualisation de données est accompagné d'un équivalent textuel pour les lecteurs d'écran.
- **Rôles ARIA**: Utilisation stricte des rôles ARIA (`header`, `search`, `switch`, etc.) pour définir la sémantique des composants.
