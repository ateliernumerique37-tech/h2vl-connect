'use client';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, query, where, Firestore } from 'firebase/firestore';
import type { Inscription } from '@/lib/types';

const inscriptionsCollectionName = 'inscriptions';

export async function getInscriptions(db: Firestore): Promise<Inscription[]> {
    const inscriptionsCollection = collection(db, inscriptionsCollectionName);
    const snapshot = await getDocs(inscriptionsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inscription));
}

export async function getInscriptionsForEvent(db: Firestore, eventId: string): Promise<Inscription[]> {
    const inscriptionsCollection = collection(db, inscriptionsCollectionName);
    const q = query(inscriptionsCollection, where('id_evenement', '==', eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inscription));
}

export async function addInscription(db: Firestore, inscriptionData: Omit<Inscription, 'id'>): Promise<string> {
    const inscriptionsCollection = collection(db, inscriptionsCollectionName);
    const docRef = await addDoc(inscriptionsCollection, inscriptionData);
    return docRef.id;
}

export async function updateInscription(db: Firestore, id: string, updates: Partial<Inscription>): Promise<void> {
    const docRef = doc(db, inscriptionsCollectionName, id);
    await updateDoc(docRef, updates);
}
