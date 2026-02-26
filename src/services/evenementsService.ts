'use client';
import { collection, doc, addDoc, updateDoc, query, where, writeBatch, getDocs, type Firestore } from 'firebase/firestore';
import type { Evenement } from '@/lib/types';

const evenementsCollectionName = 'evenements';
const inscriptionsCollectionName = 'inscriptions';

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
