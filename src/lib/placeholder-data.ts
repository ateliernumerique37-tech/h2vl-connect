import type { Adherent, Evenement, Inscription, Cotisation, Admin, LogAdmin } from './types';

export const adherents: Adherent[] = [
  {
    id: 'user-1',
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@email.com',
    telephone: '0612345678',
    adresse: '123 Rue de la République, 69001 Lyon',
    dateNaissance: '1985-05-20T00:00:00.000Z',
    genre: 'H',
    dateInscription: '2023-01-15T10:00:00.000Z',
    estMembreBureau: true,
    estBenevole: true,
    estMembreFaaf: false,
    accordeDroitImage: true,
    cotisationAJour: true,
  },
  {
    id: 'user-2',
    nom: 'Martin',
    prenom: 'Marie',
    email: 'marie.martin@email.com',
    telephone: '0687654321',
    adresse: '456 Avenue des Champs-Élysées, 75008 Paris',
    dateNaissance: '1992-11-30T00:00:00.000Z',
    genre: 'F',
    dateInscription: '2023-02-20T14:30:00.000Z',
    estMembreBureau: false,
    estBenevole: true,
    estMembreFaaf: true,
    accordeDroitImage: true,
    cotisationAJour: true,
  },
  {
    id: 'user-3',
    nom: 'Bernard',
    prenom: 'Paul',
    email: 'paul.bernard@email.com',
    telephone: '0611223344',
    adresse: '789 Boulevard de la Liberté, 59000 Lille',
    dateNaissance: '1978-03-12T00:00:00.000Z',
    genre: 'H',
    dateInscription: '2023-03-10T09:00:00.000Z',
    estMembreBureau: false,
    estBenevole: false,
    estMembreFaaf: false,
    accordeDroitImage: false,
    cotisationAJour: false,
  },
];

export const cotisations: Cotisation[] = [
    { id: 'cot-1', adherentId: 'user-1', annee: 2023, datePaiement: '2023-01-15T00:00:00.000Z', montant: 50 },
    { id: 'cot-2', adherentId: 'user-1', annee: 2024, datePaiement: '2024-01-20T00:00:00.000Z', montant: 50 },
    { id: 'cot-3', adherentId: 'user-2', annee: 2023, datePaiement: '2023-02-20T00:00:00.000Z', montant: 50 },
    { id: 'cot-4', adherentId: 'user-2', annee: 2024, datePaiement: '2024-02-18T00:00:00.000Z', montant: 50 },
    { id: 'cot-5', adherentId: 'user-3', annee: 2023, datePaiement: '2023-03-10T00:00:00.000Z', montant: 50 },
];

export const evenements: Evenement[] = [
  {
    id: 'evt-1',
    titre: 'Assemblée Générale Annuelle',
    description: 'Rejoignez-nous pour notre assemblée générale annuelle pour discuter des réalisations de l\'année passée et des projets futurs.',
    date: '2024-09-15T18:00:00.000Z',
    lieu: 'Salle des fêtes, Lyon',
    prix: 0,
    imageId: 'event-1',
  },
  {
    id: 'evt-2',
    titre: 'Atelier de Codage pour Débutants',
    description: 'Un atelier pratique pour apprendre les bases de la programmation web. Ouvert à tous les niveaux.',
    date: '2024-10-05T09:00:00.000Z',
    lieu: 'Espace Co-working, Paris',
    prix: 15,
    imageId: 'event-2',
    necessiteMenu: true,
    optionsMenu: {
      aperitifs: ['Kir', 'Jus de fruit'],
      entrees: ['Salade composée', 'Verrine de saison'],
      plats: ['Poulet basquaise et son riz', 'Option végétarienne : Lasagnes aux légumes'],
      fromages: ['Assiette de fromages locaux', 'Fromage blanc'],
      desserts: ['Mousse au chocolat', 'Salade de fruits frais'],
    },
  },
  {
    id: 'evt-3',
    titre: 'Pique-nique Communautaire',
    description: 'Un événement convivial pour se retrouver et partager un bon moment en plein air. Apportez votre plat préféré !',
    date: '2024-07-20T12:00:00.000Z',
    lieu: 'Parc de la Tête d\'Or, Lyon',
    prix: 0,
    imageId: 'event-3',
  },
   {
    id: 'evt-4',
    titre: 'Conférence sur l\'Accessibilité',
    description: 'Des experts partagent leurs connaissances sur la création de produits numériques inclusifs pour tous.',
    date: '2024-11-22T14:00:00.000Z',
    lieu: 'En ligne',
    prix: 5,
    imageId: 'event-4',
  },
   {
    id: 'evt-5',
    titre: 'Tournoi de Football Amical',
    description: 'Formez votre équipe et participez à notre tournoi annuel. Fair-play et bonne humeur garantis !',
    date: '2024-08-10T10:00:00.000Z',
    lieu: 'Stade Municipal, Marseille',
    prix: 10,
    imageId: 'event-5',
  },
   {
    id: 'evt-6',
    titre: 'Journée Bénévolat',
    description: 'Aidez-nous à rénover les locaux de l\'association. Chaque aide est la bienvenue.',
    date: '2024-09-28T09:30:00.000Z',
    lieu: 'Siège de l\'association',
    prix: 0,
    imageId: 'event-6',
  },
];

export const inscriptions: Inscription[] = [
  {
    id: 'ins-1',
    id_evenement: 'evt-2',
    id_adherent: 'user-1',
    a_paye: true,
    date_inscription: '2024-09-01T11:00:00.000Z',
    choixMenu: {
      aperitifChoisi: 'Kir',
      entreeChoisie: 'Salade composée',
      platChoisi: 'Poulet basquaise et son riz',
      fromageChoisi: 'Assiette de fromages locaux',
      dessertChoisi: 'Mousse au chocolat',
    }
  },
  {
    id: 'ins-2',
    id_evenement: 'evt-2',
    id_adherent: 'user-3',
    a_paye: false,
    date_inscription: '2024-09-02T16:45:00.000Z',
  },
  {
    id: 'ins-3',
    id_evenement: 'evt-4',
    id_adherent: 'user-2',
    a_paye: true,
    date_inscription: '2024-10-15T10:00:00.000Z',
  },
];

export const administrateurs: Admin[] = [
    { id: 'admin-1', nom: 'Sophie Manager', email: 'sophie.manager@example.com' },
    { id: 'user-1', nom: 'Jean Dupont', email: 'jean.dupont@email.com' },
];

export const logsAdmin: LogAdmin[] = [
    { id: 'log-1', nomAdmin: 'Sophie Manager', actionRealisee: "A créé l'événement 'Assemblée Générale Annuelle'", dateAction: '2024-09-01T10:00:00.000Z' },
    { id: 'log-2', nomAdmin: 'Jean Dupont', actionRealisee: "A modifié l'adhérent 'Marie Martin'", dateAction: '2024-09-02T14:20:00.000Z' },
    { id: 'log-3', nomAdmin: 'Sophie Manager', actionRealisee: "A supprimé l'inscription de 'Paul Bernard' à 'Atelier de Codage'", dateAction: '2024-09-03T09:05:00.000Z' },
];
