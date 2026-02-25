'use client';
import { db } from '@/lib/firebase';
import type { Inscription } from '@/lib/types';
import { collection, getDocs, doc, addDoc, updateDoc, query, where } from 'firebase/firestore';

const inscriptionsCollection = collection(db, 'inscriptions');

export async function getInscriptions(): Promise<Inscription[]> {
    const snapshot = await getDocs(inscriptionsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inscription));
}

export async function getInscriptionsForEvent(eventId: string): Promise<Inscription[]> {
    const q = query(inscriptionsCollection, where('id_evenement', '==', eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inscription));
}

export async function addInscription(inscriptionData: Omit<Inscription, 'id'>): Promise<string> {
    const docRef = await addDoc(inscriptionsCollection, inscriptionData);
    return docRef.id;
}

export async function updateInscription(id: string, updates: Partial<Inscription>): Promise<void> {
    const docRef = doc(db, 'inscriptions', id);
    await updateDoc(docRef, updates);
}
