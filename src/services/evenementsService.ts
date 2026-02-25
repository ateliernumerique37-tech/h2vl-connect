'use client';
import { db } from '@/lib/firebase';
import type { Evenement } from '@/lib/types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy, query, writeBatch, where } from 'firebase/firestore';

const evenementsCollection = collection(db, 'evenements');

export async function getEvenements(): Promise<Evenement[]> {
  const snapshot = await getDocs(query(evenementsCollection, orderBy('date', 'desc')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evenement));
}

export async function getEvenementById(id: string): Promise<Evenement | undefined> {
    const docRef = doc(db, 'evenements', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Evenement;
    }
    return undefined;
}

export async function addEvenement(eventData: Omit<Evenement, 'id'>): Promise<string> {
    const docRef = await addDoc(evenementsCollection, eventData);
    return docRef.id;
}

export async function updateEvenement(id: string, updates: Partial<Evenement>): Promise<void> {
    const docRef = doc(db, 'evenements', id);
    await updateDoc(docRef, updates);
}

export async function deleteEvenement(id: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete the event
    const eventRef = doc(db, 'evenements', id);
    batch.delete(eventRef);

    // Find and delete all inscriptions for this event
    const inscriptionsQuery = query(collection(db, 'inscriptions'), where('id_evenement', '==', id));
    const inscriptionsSnapshot = await getDocs(inscriptionsQuery);
    inscriptionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}
