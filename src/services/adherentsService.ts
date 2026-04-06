'use client';
import { collection, doc, addDoc, updateDoc, query, where, writeBatch, getDocs, type Firestore, deleteDoc } from 'firebase/firestore';
import type { Adherent } from '@/lib/types';

const adherentsCollectionName = 'adherents';
const cotisationsCollectionName = 'cotisations';
const inscriptionsCollectionName = 'inscriptions';

/**
 * Ajoute un adhérent et crée sa cotisation initiale si nécessaire.
 */
export async function addAdherent(db: Firestore, adherentData: Omit<Adherent, 'id'>): Promise<string> {
    const { prenom, nom, email, telephone, adresse, dateNaissance, genre, dateInscription, estMembreBureau, estBenevole, estMembreFaaf, accordeDroitImage, cotisationAJour } = adherentData;
    
    const adherentsCollection = collection(db, adherentsCollectionName);
    const docRef = await addDoc(adherentsCollection, {
        prenom, nom, email, telephone, adresse, dateNaissance, genre, dateInscription, estMembreBureau, estBenevole, estMembreFaaf, accordeDroitImage, cotisationAJour
    });
    
    if (cotisationAJour) {
        await addCotisationForYear(db, docRef.id, new Date().getFullYear(), estMembreFaaf);
    }
    
    return docRef.id;
}

/**
 * Mise à jour d'un adhérent avec protection contre le Mass Assignment.
 */
export async function updateAdherent(db: Firestore, id: string, updates: Partial<Adherent>): Promise<void> {
    const docRef = doc(db, adherentsCollectionName, id);
    
    // Filtrage strict des champs autorisés pour la mise à jour (13 champs gérés)
    const allowedUpdates: Partial<Adherent> = {};
    const keys: (keyof Adherent)[] = [
        'prenom', 
        'nom', 
        'email', 
        'telephone', 
        'adresse', 
        'dateNaissance', 
        'genre', 
        'dateInscription', 
        'estMembreBureau', 
        'estBenevole', 
        'estMembreFaaf', 
        'accordeDroitImage', 
        'cotisationAJour'
    ];
    
    keys.forEach(key => {
        if (updates[key] !== undefined) {
            (allowedUpdates as any)[key] = updates[key];
        }
    });

    if (updates.cotisationAJour === true) {
        await addCotisationForYear(db, id, new Date().getFullYear(), updates.estMembreFaaf ?? false);
        const { cotisationAJour, ...rest } = allowedUpdates;
        if (Object.keys(rest).length > 0) await updateDoc(docRef, rest);
    } else if (updates.cotisationAJour === false) {
        await removeCotisation(db, id);
        const { cotisationAJour, ...rest } = allowedUpdates;
        if (Object.keys(rest).length > 0) await updateDoc(docRef, rest);
    } else {
        await updateDoc(docRef, allowedUpdates);
    }
}

/**
 * Suppression d'un adhérent avec CASCADE LOGICIELLE (RGPD - Droit à l'oubli).
 * Supprime l'adhérent, ses cotisations et ses inscriptions en une seule transaction.
 */
export async function deleteAdherent(db: Firestore, id: string): Promise<void> {
    const batch = writeBatch(db);
    
    // 1. Référence de l'adhérent
    const adherentRef = doc(db, adherentsCollectionName, id);
    batch.delete(adherentRef);
    
    // 2. Suppression des cotisations liées
    const cotisationsSnap = await getDocs(query(collection(db, cotisationsCollectionName), where('adherentId', '==', id)));
    cotisationsSnap.forEach((doc) => batch.delete(doc.ref));

    // 3. Suppression des inscriptions liées
    const inscriptionsSnap = await getDocs(query(collection(db, inscriptionsCollectionName), where('id_adherent', '==', id)));
    inscriptionsSnap.forEach((doc) => batch.delete(doc.ref));
    
    await batch.commit();
}

/**
 * Purge complète de la base des adhérents.
 */
export async function deleteAllAdherents(db: Firestore): Promise<void> {
    const batchSize = 500;
    const adherentsSnap = await getDocs(collection(db, adherentsCollectionName));
    const cotisationsSnap = await getDocs(collection(db, cotisationsCollectionName));
    const inscriptionsSnap = await getDocs(collection(db, inscriptionsCollectionName));

    const allDocs = [...adherentsSnap.docs, ...cotisationsSnap.docs, ...inscriptionsSnap.docs];

    for (let i = 0; i < allDocs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = allDocs.slice(i, i + batchSize);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

/**
 * Ajoute une cotisation pour une année donnée.
 * Met à jour cotisationAJour uniquement si l'année est l'année en cours.
 * Montant : 40€ si membre FAAF, 15€ sinon.
 */
export async function addCotisationForYear(
    db: Firestore,
    adherentId: string,
    annee: number,
    isFaaf: boolean
): Promise<void> {
    const currentYear = new Date().getFullYear();
    const montant = isFaaf ? 40 : 15;

    const q = query(
        collection(db, cotisationsCollectionName),
        where('adherentId', '==', adherentId),
        where('annee', '==', annee)
    );
    const existing = await getDocs(q);

    const batch = writeBatch(db);
    if (existing.empty) {
        const cotisationRef = doc(collection(db, cotisationsCollectionName));
        batch.set(cotisationRef, {
            adherentId,
            annee,
            datePaiement: new Date().toISOString(),
            montant,
        });
    }

    if (annee === currentYear) {
        const adherentRef = doc(db, adherentsCollectionName, adherentId);
        batch.update(adherentRef, { cotisationAJour: true });
    }

    await batch.commit();
}

/**
 * Supprime la cotisation d'une année donnée.
 * Met à jour cotisationAJour uniquement si l'année est l'année en cours.
 */
export async function deleteCotisationForYear(
    db: Firestore,
    adherentId: string,
    annee: number
): Promise<void> {
    const currentYear = new Date().getFullYear();
    const q = query(
        collection(db, cotisationsCollectionName),
        where('adherentId', '==', adherentId),
        where('annee', '==', annee)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((d) => batch.delete(d.ref));

    if (annee === currentYear) {
        const adherentRef = doc(db, adherentsCollectionName, adherentId);
        batch.update(adherentRef, { cotisationAJour: false });
    }

    await batch.commit();
}

/** Alias pour la compatibilité avec l'ancien code (année en cours). */
export async function addCotisation(db: Firestore, adherentId: string, isFaaf = false): Promise<void> {
    await addCotisationForYear(db, adherentId, new Date().getFullYear(), isFaaf);
}

/** Alias pour la compatibilité avec l'ancien code (année en cours). */
export async function removeCotisation(db: Firestore, adherentId: string): Promise<void> {
    await deleteCotisationForYear(db, adherentId, new Date().getFullYear());
}
