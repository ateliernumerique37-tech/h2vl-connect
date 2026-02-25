'use client';
import { db } from '@/lib/firebase';
import type { Adherent, Cotisation } from '@/lib/types';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    writeBatch,
    orderBy,
} from 'firebase/firestore';

const adherentsCollection = collection(db, 'adherents');
const cotisationsCollection = collection(db, 'cotisations');

// ADHERENT CRUD

export async function getAdherents(): Promise<Adherent[]> {
  const snapshot = await getDocs(query(adherentsCollection, orderBy('nom'), orderBy('prenom')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Adherent));
}

export async function getAdherentById(id: string): Promise<Adherent | undefined> {
    const docRef = doc(db, 'adherents', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Adherent;
    }
    return undefined;
}

export async function addAdherent(adherentData: Omit<Adherent, 'id'>): Promise<string> {
    const docRef = await addDoc(adherentsCollection, adherentData);
    
    if (adherentData.cotisationAJour) {
        await addCotisation(docRef.id);
    }
    
    return docRef.id;
}

export async function updateAdherent(id: string, updates: Partial<Adherent>): Promise<void> {
    const docRef = doc(db, 'adherents', id);
    await updateDoc(docRef, updates);
}

export async function deleteAdherent(id: string): Promise<void> {
    const batch = writeBatch(db);
    
    const adherentRef = doc(db, 'adherents', id);
    batch.delete(adherentRef);
    
    // Also delete related cotisations
    const q = query(cotisationsCollection, where('adherentId', '==', id));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}

// COTISATION-RELATED FUNCTIONS

export async function getCotisationsForAdherent(adherentId: string): Promise<Cotisation[]> {
    const q = query(
        cotisationsCollection, 
        where('adherentId', '==', adherentId), 
        orderBy('datePaiement', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cotisation));
}

export async function addCotisation(adherentId: string): Promise<void> {
    const batch = writeBatch(db);

    const cotisationRef = doc(collection(db, 'cotisations'));
    batch.set(cotisationRef, {
        adherentId: adherentId,
        annee: new Date().getFullYear(),
        datePaiement: new Date().toISOString(),
        montant: 15,
    });

    const adherentRef = doc(db, 'adherents', adherentId);
    batch.update(adherentRef, { cotisationAJour: true });

    await batch.commit();
}
