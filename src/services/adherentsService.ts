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
    const adherentsCollection = collection(db, adherentsCollectionName);
    const docRef = await addDoc(adherentsCollection, adherentData);
    
    if (adherentData.cotisationAJour) {
        await addCotisation(db, docRef.id);
    }
    
    return docRef.id;
}

/**
 * Importation massive d'adhérents.
 */
export async function batchAddAdherents(db: Firestore, adherents: Omit<Adherent, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    adherents.forEach(adherent => {
        const adherentRef = doc(collection(db, adherentsCollectionName));
        batch.set(adherentRef, adherent);
        if (adherent.cotisationAJour) {
            const cotisationRef = doc(collection(db, cotisationsCollectionName));
            batch.set(cotisationRef, {
                adherentId: adherentRef.id,
                annee: new Date().getFullYear(),
                datePaiement: new Date().toISOString(),
                montant: 15,
            });
        }
    });
    await batch.commit();
}

/**
 * Mise à jour d'un adhérent. 
 * Gère l'ajout ou la suppression automatique de la cotisation en fonction du switch.
 */
export async function updateAdherent(db: Firestore, id: string, updates: Partial<Adherent>): Promise<void> {
    const docRef = doc(db, adherentsCollectionName, id);
    
    if (updates.cotisationAJour === true) {
        await addCotisation(db, id);
        const { cotisationAJour, ...rest } = updates;
        if (Object.keys(rest).length > 0) await updateDoc(docRef, rest);
    } else if (updates.cotisationAJour === false) {
        await removeCotisation(db, id);
        const { cotisationAJour, ...rest } = updates;
        if (Object.keys(rest).length > 0) await updateDoc(docRef, rest);
    } else {
        await updateDoc(docRef, updates);
    }
}

/**
 * Suppression d'un adhérent avec cascade logicielle.
 */
export async function deleteAdherent(db: Firestore, id: string): Promise<void> {
    const batch = writeBatch(db);
    const adherentRef = doc(db, adherentsCollectionName, id);
    batch.delete(adherentRef);
    
    const cotisationsSnap = await getDocs(query(collection(db, cotisationsCollectionName), where('adherentId', '==', id)));
    cotisationsSnap.forEach((doc) => batch.delete(doc.ref));

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
 * Ajoute une cotisation et met à jour le statut de l'adhérent.
 * Vérifie d'abord si une cotisation existe déjà pour l'année en cours.
 */
export async function addCotisation(db: Firestore, adherentId: string): Promise<void> {
    const currentYear = new Date().getFullYear();
    const q = query(
        collection(db, cotisationsCollectionName),
        where('adherentId', '==', adherentId),
        where('annee', '==', currentYear)
    );
    const existing = await getDocs(q);
    
    const batch = writeBatch(db);
    if (existing.empty) {
        const cotisationRef = doc(collection(db, cotisationsCollectionName));
        batch.set(cotisationRef, {
            adherentId,
            annee: currentYear,
            datePaiement: new Date().toISOString(),
            montant: 15,
        });
    }
    
    const adherentRef = doc(db, adherentsCollectionName, adherentId);
    batch.update(adherentRef, { cotisationAJour: true });
    await batch.commit();
}

/**
 * Supprime la cotisation de l'année en cours et met à jour le statut.
 */
export async function removeCotisation(db: Firestore, adherentId: string): Promise<void> {
    const currentYear = new Date().getFullYear();
    const q = query(
        collection(db, cotisationsCollectionName),
        where('adherentId', '==', adherentId),
        where('annee', '==', currentYear)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => batch.delete(doc.ref));
    
    const adherentRef = doc(db, adherentsCollectionName, adherentId);
    batch.update(adherentRef, { cotisationAJour: false });
    await batch.commit();
}
