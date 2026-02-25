'use client';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, orderBy, Firestore } from 'firebase/firestore';
import type { Adherent, Cotisation } from '@/lib/types';

const adherentsCollectionName = 'adherents';
const cotisationsCollectionName = 'cotisations';

// ADHERENT CRUD

export async function getAdherents(db: Firestore): Promise<Adherent[]> {
  const adherentsCollection = collection(db, adherentsCollectionName);
  const snapshot = await getDocs(query(adherentsCollection, orderBy('nom'), orderBy('prenom')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Adherent));
}

export async function getAdherentById(db: Firestore, id: string): Promise<Adherent | undefined> {
    const docRef = doc(db, adherentsCollectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Adherent;
    }
    return undefined;
}

export async function addAdherent(db: Firestore, adherentData: Omit<Adherent, 'id'>): Promise<string> {
    const adherentsCollection = collection(db, adherentsCollectionName);
    const docRef = await addDoc(adherentsCollection, adherentData);
    
    if (adherentData.cotisationAJour) {
        await addCotisation(db, docRef.id);
    }
    
    return docRef.id;
}

export async function batchAddAdherents(db: Firestore, adherents: Omit<Adherent, 'id'>[]): Promise<void> {
    const adherentsCollection = collection(db, adherentsCollectionName);
    const cotisationsCollection = collection(db, cotisationsCollectionName);
    const batch = writeBatch(db);

    adherents.forEach(adherent => {
        const adherentRef = doc(adherentsCollection);
        batch.set(adherentRef, adherent);

        if (adherent.cotisationAJour) {
            const cotisationRef = doc(cotisationsCollection);
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
    const cotisationsCollection = collection(db, cotisationsCollectionName);
    const batch = writeBatch(db);
    
    const adherentRef = doc(db, adherentsCollectionName, id);
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

export async function getCotisationsForAdherent(db: Firestore, adherentId: string): Promise<Cotisation[]> {
    const cotisationsCollection = collection(db, cotisationsCollectionName);
    const q = query(
        cotisationsCollection, 
        where('adherentId', '==', adherentId), 
        orderBy('datePaiement', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cotisation));
}

export async function addCotisation(db: Firestore, adherentId: string): Promise<void> {
    const batch = writeBatch(db);

    const cotisationRef = doc(collection(db, cotisationsCollectionName));
    batch.set(cotisationRef, {
        adherentId: adherentId,
        annee: new Date().getFullYear(),
        datePaiement: new Date().toISOString(),
        montant: 15,
    });

    const adherentRef = doc(db, adherentsCollectionName, adherentId);
    batch.update(adherentRef, { cotisationAJour: true });

    await batch.commit();
}
