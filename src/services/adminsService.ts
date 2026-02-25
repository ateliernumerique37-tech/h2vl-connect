'use client';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import type { Admin } from '@/lib/types';
import { initializeFirebase } from '@/firebase';

const { firestore: db, auth } = initializeFirebase();


const adminsCollection = collection(db, 'admins');

export async function getAdmins(): Promise<Admin[]> {
    const snapshot = await getDocs(adminsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Admin));
}

export async function addAdmin(adminData: Omit<Admin, 'id'>, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
    const user = userCredential.user;

    // Utilise setDoc avec l'UID de l'utilisateur comme ID de document pour être cohérent
    const adminDocRef = doc(db, 'admins', user.uid);
    await setDoc(adminDocRef, adminData);

    return user.uid; // Retourne l'UID, qui est aussi l'ID du document
}

export async function deleteAdmin(id: string): Promise<void> {
    // Note: This does not delete the user from Firebase Auth, 
    // which requires the Admin SDK for security reasons.
    const docRef = doc(db, 'admins', id);
    await deleteDoc(docRef);
}
