'use client';
import { collection, doc, addDoc, updateDoc, query, where, writeBatch, getDocs, type Firestore } from 'firebase/firestore';
import type { Adherent } from '@/lib/types';

const adherentsCollectionName = 'adherents';
const cotisationsCollectionName = 'cotisations';
const inscriptionsCollectionName = 'inscriptions';

export async function addAdherent(db: Firestore, adherentData: Omit<Adherent, 'id'>): Promise<string> {
    const adherentsCollection = collection(db, adherentsCollectionName);
    const docRef = await addDoc(adherentsCollection, adherentData);
    
    if (adherentData.cotisationAJour) {
        await addCotisation(db, docRef.id);
    }
    
    return docRef.id;
}

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

export async function updateAdherent(db: Firestore, id: string, updates: Partial<Adherent>): Promise<void> {
    const docRef = doc(db, adherentsCollectionName, id);
    await updateDoc(docRef, updates);
}

export async function deleteAdherent(db: Firestore, id: string): Promise<void> {
    const batch = writeBatch(db);
    
    const adherentRef = doc(db, adherentsCollectionName, id);
    batch.delete(adherentRef);
    
    const cotisationsQuery = query(collection(db, cotisationsCollectionName), where('adherentId', '==', id));
    const cotisationsSnap = await getDocs(cotisationsQuery);
    cotisationsSnap.forEach((doc) => batch.delete(doc.ref));

    const inscriptionsQuery = query(collection(db, inscriptionsCollectionName), where('id_adherent', '==', id));
    const inscriptionsSnap = await getDocs(inscriptionsQuery);
    inscriptionsSnap.forEach((doc) => batch.delete(doc.ref));
    
    await batch.commit();
}

/**
 * Supprime TOUS les adhérents et leurs données liées (RGPD Cascade).
 */
export async function deleteAllAdherents(db: Firestore): Promise<void> {
    const adherentsSnap = await getDocs(collection(db, adherentsCollectionName));
    const cotisationsSnap = await getDocs(collection(db, cotisationsCollectionName));
    const inscriptionsSnap = await getDocs(collection(db, inscriptionsCollectionName));

    const batch = writeBatch(db);
    adherentsSnap.forEach(d => batch.delete(d.ref));
    cotisationsSnap.forEach(d => batch.delete(d.ref));
    inscriptionsSnap.forEach(d => batch.delete(d.ref));

    await batch.commit();
}

export async function addCotisation(db: Firestore, adherentId: string): Promise<void> {
    const batch = writeBatch(db);
    const cotisationRef = doc(collection(db, cotisationsCollectionName));
    batch.set(cotisationRef, {
        adherentId,
        annee: new Date().getFullYear(),
        datePaiement: new Date().toISOString(),
        montant: 15,
    });
    const adherentRef = doc(db, adherentsCollectionName, adherentId);
    batch.update(adherentRef, { cotisationAJour: true });
    await batch.commit();
}
