
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

export interface Evenement {
  id: string;
  titre: string;
  description: string;
  date: string; // ISO string format
  lieu: string;
  prix: number;
  nombrePlacesMax: number;
  imageId: string;
  necessiteMenu?: boolean;
  optionsMenu?: {
    aperitifs?: string[];
    entrees?: string[];
    plats?: string[];
    fromages?: string[];
    desserts?: string[];
  };
  estSortieBowling?: boolean;
  dateLimiteInscription?: string; // ISO string — inscriptions fermées après cette date
}

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
  choixBowling?: {
    avecBarrieres?: boolean;
    sansBarrieres?: boolean;
    prendGouter?: boolean;
  };
}

export interface Cotisation {
  id: string;
  adherentId: string;
  annee: number | string;
  datePaiement: string; // ISO string
  montant: number;
}

export interface Admin {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: 'Administrateur' | 'Modérateur';
  dateCreation: string; // ISO string
}

export interface LogAdmin {
  id: string;
  nomAdmin: string;
  actionRealisee: string;
  dateAction: string; // ISO string
}

export interface LogAnniversaire {
  id: string;
  id_adherent: string;
  date_envoi: string; // YYYY-MM-DD
  statut: 'envoyé';
}

export interface CampagneEmail {
  id: string;
  sujet: string;
  corps: string;
  dateEnvoi: string;
  nbDestinataires: number;
}

export interface EmailTracking {
  jeton: string;
  adherentId: string;
  campagneId: string;
  statut: 'envoyé' | 'confirmé';
  dateEnvoi: string;
  dateLecture: string | null;
}

export interface InvitationEvenement {
  evenementId: string;
  eventTitle: string;
  adherentId: string;
  statut: 'envoyé' | 'inscrit';
  dateEnvoi: string;
  dateInscription: string | null;
}
