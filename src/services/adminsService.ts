'use client';
import { getFirestore, collection, getDocs, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import type { Admin } from '@/lib/types';
import { initializeFirebase } from '@/firebase';

const { firestore: db, auth } = initializeFirebase();


const adminsCollection = collection(db, 'admins');

export async function getAdmins(): Promise<Admin[]> {
    const snapshot = await getDocs(adminsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Admin));
}

export async function addAdmin(adminData: Omit<Admin, 'id' | 'authUid'>, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
    const docRef = await addDoc(adminsCollection, {
        ...adminData,
        authUid: userCredential.user.uid // Link Firestore doc to Auth user
    });
    return docRef.id;
}

export async function deleteAdmin(id: string): Promise<void> {
    // Note: This does not delete the user from Firebase Auth, 
    // which requires the Admin SDK for security reasons.
    const docRef = doc(db, 'admins', id);
    await deleteDoc(docRef);
}
