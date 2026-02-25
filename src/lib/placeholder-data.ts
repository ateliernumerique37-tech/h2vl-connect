import type { Adherent, Evenement, Inscription, Cotisation, Admin, LogAdmin } from './types';

export const adherents: Adherent[] = [];

export const evenements: Evenement[] = [
  {
    id: 'evt-1',
    titre: 'Assemblée Générale 2024',
    description: "Joignez-vous à nous pour notre assemblée générale annuelle. Nous discuterons des accomplissements de l'année passée, des projets futurs, et élirons les nouveaux membres du bureau. Un moment clé pour la vie de notre association.",
    date: new Date(new Date().getFullYear(), 8, 15, 18).toISOString(), // Sep 15 of current year
    lieu: "Salle des fêtes, Lyon",
    prix: 0,
    imageId: 'event-1'
  },
  {
    id: 'evt-2',
    titre: 'Atelier Créatif : Poterie & Céramique',
    description: "Exprimez votre créativité lors de notre atelier de poterie. Ouvert à tous les niveaux, des débutants curieux aux confirmés. Venez modeler, créer et repartir avec votre propre œuvre. Matériel fourni.",
    date: new Date(new Date().getFullYear(), 9, 5, 9).toISOString(), // Oct 5 of current year
    lieu: "L'Atelier des Arts, Paris",
    prix: 15,
    imageId: 'event-2'
  },
    {
    id: 'evt-3',
    titre: 'Pique-nique Annuel 2023',
    description: "Retour sur notre traditionnel pique-nique au parc. Un grand moment de convivialité, de partage et de jeux en plein air qui a rassemblé petits et grands.",
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

export const logsAdmin: LogAdmin[] = [];
