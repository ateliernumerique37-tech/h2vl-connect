export interface Adherent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_inscription: string; // ISO string format
}

export interface Evenement {
  id: string;
  titre: string;
  description: string;
  date: string; // ISO string format
  lieu: string;
  prix: number;
  imageId: string;
}

export interface Inscription {
  id: string;
  id_evenement: string;
  id_adherent: string;
  a_paye: boolean;
  date_inscription: string; // ISO string format
}
