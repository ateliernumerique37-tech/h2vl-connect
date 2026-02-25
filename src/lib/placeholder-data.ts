import type { Adherent, Evenement, Inscription } from './types';

export const adherents: Adherent[] = [
  {
    id: 'user-1',
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@email.com',
    telephone: '0612345678',
    date_inscription: '2023-01-15T10:00:00.000Z',
  },
  {
    id: 'user-2',
    nom: 'Martin',
    prenom: 'Marie',
    email: 'marie.martin@email.com',
    telephone: '0687654321',
    date_inscription: '2023-02-20T14:30:00.000Z',
  },
  {
    id: 'user-3',
    nom: 'Bernard',
    prenom: 'Paul',
    email: 'paul.bernard@email.com',
    telephone: '0611223344',
    date_inscription: '2023-03-10T09:00:00.000Z',
  },
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
