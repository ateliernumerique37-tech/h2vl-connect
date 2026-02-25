'use client';
import { collection, getDocs, doc, setDoc, deleteDoc, type Firestore, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, type Auth } from 'firebase/auth';
import type { Admin, Adherent } from '@/lib/types';

export async function getAdmins(db: Firestore): Promise<Admin[]> {
    const adminsCollection = collection(db, 'admins');
    const snapshot = await getDocs(adminsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Admin));
}

export async function addAdmin(db: Firestore, auth: Auth, adminData: Omit<Admin, 'id'>, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
    const user = userCredential.user;
    
    const batch = writeBatch(db);

    // Create admin document
    const adminDocRef = doc(db, 'admins', user.uid);
    batch.set(adminDocRef, adminData);

    // Create corresponding adherent document
    const adherentRef = doc(db, 'adherents', user.uid);
    const adherentData: Omit<Adherent, 'id'> = {
        prenom: adminData.prenom,
        nom: adminData.nom,
        email: adminData.email,
        dateInscription: new Date().toISOString(),
        telephone: '',
        adresse: '',
        dateNaissance: '',
        genre: 'Autre',
        estMembreBureau: true, // Admins are implicitly bureau members
        estBenevole: false,
        estMembreFaaf: false,
        accordeDroitImage: false,
        cotisationAJour: true, // Admins should be up-to-date
    };
    batch.set(adherentRef, adherentData);

    await batch.commit();

    return user.uid;
}

export async function deleteAdmin(db: Firestore, id: string): Promise<void> {
    const docRef = doc(db, 'admins', id);
    await deleteDoc(docRef);
}
