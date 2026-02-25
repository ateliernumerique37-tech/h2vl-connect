import type { Adherent, Evenement, Inscription, Cotisation, Admin, LogAdmin } from './types';

export const adherents: Adherent[] = [
    {
      id: 'adh-1',
      prenom: 'Alice',
      nom: 'Martin',
      email: 'alice.martin@email.com',
      telephone: '0612345678',
      adresse: '123 Rue de Paris, 75001 Paris',
      dateNaissance: '1990-08-28T00:00:00.000Z', // Note: Birthday set for demonstration
      genre: 'F',
      dateInscription: '2022-01-10T00:00:00.000Z',
      estMembreBureau: true,
      estBenevole: true,
      estMembreFaaf: true,
      accordeDroitImage: true,
      cotisationAJour: true,
    },
    {
      id: 'adh-2',
      prenom: 'Bob',
      nom: 'Durand',
      email: 'bob.durand@email.com',
      telephone: '0687654321',
      adresse: '45 Avenue de Lyon, 69002 Lyon',
      dateNaissance: '1985-11-20T00:00:00.000Z',
      genre: 'H',
      dateInscription: '2023-03-22T00:00:00.000Z',
      estMembreBureau: false,
      estBenevole: true,
      estMembreFaaf: false,
      accordeDroitImage: true,
      cotisationAJour: false,
    },
    {
      id: 'adh-3',
      prenom: 'Charlie',
      nom: 'Leclerc',
      email: 'charlie.leclerc@email.com',
      telephone: '0611223344',
      adresse: '78 Boulevard de la Plage, 06000 Nice',
      dateNaissance: '2005-08-01T00:00:00.000Z',
      genre: 'Autre',
      dateInscription: '2024-02-15T00:00:00.000Z',
      estMembreBureau: false,
      estBenevole: false,
      estMembreFaaf: true,
      accordeDroitImage: false,
      cotisationAJour: true,
    },
    {
      id: 'adh-4',
      prenom: 'Diana',
      nom: 'Ross',
      email: 'diana.ross@email.com',
      telephone: '0655667788',
      adresse: '90 Rue du Port, 13002 Marseille',
      dateNaissance: '1978-02-10T00:00:00.000Z',
      genre: 'F',
      dateInscription: '2021-09-01T00:00:00.000Z',
      estMembreBureau: false,
      estBenevole: true,
      estMembreFaaf: false,
      accordeDroitImage: true,
      cotisationAJour: true,
    },
];

export const evenements: Evenement[] = [
  {
    id: 'evt-1',
    titre: 'Assemblée Générale 2024',
    description: "Discussion sur les projets futurs.",
    date: new Date(new Date().getFullYear(), 8, 15, 18).toISOString(), // Sep 15 of current year
    lieu: "Salle des fêtes, Lyon",
    prix: 0,
    imageId: 'event-1'
  },
  {
    id: 'evt-2',
    titre: 'Atelier de Codage',
    description: "Apprendre les bases du web.",
    date: new Date(new Date().getFullYear(), 9, 5, 9).toISOString(), // Oct 5 of current year
    lieu: "Espace Co-working, Paris",
    prix: 15,
    imageId: 'event-2'
  },
    {
    id: 'evt-3',
    titre: 'Pique-nique 2023',
    description: "Pique-nique de l'année dernière.",
    date: new Date(new Date().getFullYear() - 1, 6, 20, 12).toISOString(), // July 20 of last year
    lieu: "Parc de la Tête d'Or, Lyon",
    prix: 0,
    imageId: 'event-3'
  },
];

export const inscriptions: Inscription[] = [
    {
        id: 'ins-1',
        id_evenement: 'evt-1',
        id_adherent: 'adh-1',
        a_paye: true,
        date_inscription: '2024-08-01T00:00:00.000Z'
    },
    {
        id: 'ins-2',
        id_evenement: 'evt-1',
        id_adherent: 'adh-2',
        a_paye: true,
        date_inscription: '2024-08-02T00:00:00.000Z'
    },
    {
        id: 'ins-3',
        id_evenement: 'evt-2',
        id_adherent: 'adh-1',
        a_paye: true,
        date_inscription: '2024-09-10T00:00:00.000Z'
    },
    {
        id: 'ins-4',
        id_evenement: 'evt-3',
        id_adherent: 'adh-4',
        a_paye: true,
        date_inscription: '2023-07-01T00:00:00.000Z'
    }
];


export const cotisations: Cotisation[] = [];

export const administrateurs: Admin[] = [
    { id: 'admin-1', prenom: 'Gérard', nom: 'Larcher', email: 'gerard.larcher@example.com', role: 'Président' }
];

export const logsAdmin: LogAdmin[] = [
    { id: 'log-1', nomAdmin: 'Gérard Larcher', actionRealisee: "A modifié l'adhérent Alice Martin", dateAction: '2024-05-10T10:00:00.000Z' }
];
