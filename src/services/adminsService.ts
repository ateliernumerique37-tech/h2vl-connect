'use client';
import { collection, doc, setDoc, deleteDoc, updateDoc, type Firestore, addDoc } from 'firebase/firestore';
import type { Admin } from '@/lib/types';

const ADMINS_COLLECTION = 'admins';

/**
 * Crée un profil administrateur dans Firestore.
 * Note: L'inscription Auth est gérée séparément pour éviter la déconnexion de l'utilisateur actuel.
 */
export async function createAdminProfile(db: Firestore, adminData: Omit<Admin, 'id' | 'dateCreation'>): Promise<string> {
    const adminRef = collection(db, ADMINS_COLLECTION);
    const newDoc = await addDoc(adminRef, {
        ...adminData,
        dateCreation: new Date().toISOString()
    });
    return newDoc.id;
}

/**
 * Met à jour un profil administrateur existant.
 */
export async function updateAdminProfile(db: Firestore, id: string, updates: Partial<Admin>): Promise<void> {
    const adminDocRef = doc(db, ADMINS_COLLECTION, id);
    await updateDoc(adminDocRef, updates);
}

/**
 * Supprime un profil administrateur de Firestore.
 */
export async function deleteAdminProfile(db: Firestore, id: string): Promise<void> {
    await deleteDoc(doc(db, ADMINS_COLLECTION, id));
}
