'use client';
import { collection, doc, setDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { createUserWithEmailAndPassword, type Auth } from 'firebase/auth';
import type { Admin } from '@/lib/types';

export async function addAdmin(db: Firestore, auth: Auth, adminData: Omit<Admin, 'id'>, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
    const user = userCredential.user;
    const adminDocRef = doc(db, 'admins', user.uid);
    await setDoc(adminDocRef, adminData);
    return user.uid;
}

export async function deleteAdmin(db: Firestore, id: string): Promise<void> {
    await deleteDoc(doc(db, 'admins', id));
}
