'use client';
import { collection, doc, deleteDoc, updateDoc, type Firestore, addDoc } from 'firebase/firestore';
import { updateProfile, type Auth } from 'firebase/auth';
import type { Admin } from '@/lib/types';

const ADMINS_COLLECTION = 'admins';

/**
 * Crée un profil administrateur dans Firestore.
 */
export async function createAdminProfile(db: Firestore, adminData: Omit<Admin, 'id' | 'dateCreation'>): Promise<string> {
    const { prenom, nom, email, role } = adminData;
    
    const adminRef = collection(db, ADMINS_COLLECTION);
    const newDoc = await addDoc(adminRef, {
        prenom,
        nom,
        email,
        role,
        dateCreation: new Date().toISOString()
    });
    return newDoc.id;
}

/**
 * Met à jour un profil administrateur existant avec protection contre le Mass Assignment.
 */
export async function updateAdminProfile(db: Firestore, auth: Auth, id: string, updates: Partial<Admin>): Promise<void> {
    const adminDocRef = doc(db, ADMINS_COLLECTION, id);
    
    const allowedUpdates: any = {};
    if (updates.prenom !== undefined) allowedUpdates.prenom = updates.prenom;
    if (updates.nom !== undefined) allowedUpdates.nom = updates.nom;
    if (updates.role !== undefined) allowedUpdates.role = updates.role;

    await updateDoc(adminDocRef, allowedUpdates);

    try {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === id) {
            const prenom = allowedUpdates.prenom !== undefined ? allowedUpdates.prenom : (currentUser.displayName?.split(' ')[0] || '');
            const nom = allowedUpdates.nom !== undefined ? allowedUpdates.nom : (currentUser.displayName?.split(' ').slice(1).join(' ') || '');
            const newDisplayName = `${prenom} ${nom}`.trim();
            
            if (newDisplayName && newDisplayName !== currentUser.displayName) {
                await updateProfile(currentUser, { displayName: newDisplayName });
            }
        }
    } catch (authError) {
        // Log interne uniquement, pas d'exposition front-end
    }
}

/**
 * Supprime un profil administrateur.
 */
export async function deleteAdminProfile(db: Firestore, id: string): Promise<void> {
    await deleteDoc(doc(db, ADMINS_COLLECTION, id));
}