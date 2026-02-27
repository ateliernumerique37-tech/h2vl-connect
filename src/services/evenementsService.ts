'use client';
import { collection, doc, addDoc, updateDoc, query, where, writeBatch, getDocs, getDoc, type Firestore } from 'firebase/firestore';
import type { Evenement } from '@/lib/types';

const evenementsCollectionName = 'evenements';
const inscriptionsCollectionName = 'inscriptions';

/**
 * Récupère un événement spécifique par son ID.
 * @returns L'événement typé ou null si non trouvé.
 */
export async function getEvenementById(db: Firestore, id: string): Promise<Evenement | null> {
    const docRef = doc(db, evenementsCollectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Evenement;
    }
    return null;
}

export async function addEvenement(db: Firestore, eventData: Omit<Evenement, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, evenementsCollectionName), eventData);
    return docRef.id;
}

export async function updateEvenement(db: Firestore, id: string, updates: Partial<Evenement>): Promise<void> {
    const docRef = doc(db, evenementsCollectionName, id);
    await updateDoc(docRef, updates);
}

export async function deleteEvenement(db: Firestore, id: string): Promise<void> {
    const batch = writeBatch(db);
    const eventRef = doc(db, evenementsCollectionName, id);
    batch.delete(eventRef);

    // Cascade: Suppression de toutes les inscriptions liées à cet événement
    const inscriptionsQuery = query(collection(db, inscriptionsCollectionName), where('id_evenement', '==', id));
    const inscriptionsSnap = await getDocs(inscriptionsQuery);
    inscriptionsSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
}
