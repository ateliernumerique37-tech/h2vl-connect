'use client';
import { collection, doc, addDoc, updateDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import type { Inscription } from '@/lib/types';

const inscriptionsCollectionName = 'inscriptions';

export async function addInscription(db: Firestore, inscriptionData: Omit<Inscription, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, inscriptionsCollectionName), inscriptionData);
    return docRef.id;
}

export async function updateInscription(db: Firestore, id: string, updates: Partial<Inscription>): Promise<void> {
    const docRef = doc(db, inscriptionsCollectionName, id);
    await updateDoc(docRef, updates);
}

export async function deleteInscription(db: Firestore, id: string): Promise<void> {
    const docRef = doc(db, inscriptionsCollectionName, id);
    await deleteDoc(docRef);
}
