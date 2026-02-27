'use client';
import { collection, doc, deleteDoc, updateDoc, type Firestore, addDoc } from 'firebase/firestore';
import { updateProfile, type Auth } from 'firebase/auth';
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
 * Met à jour un profil administrateur existant dans Firestore et synchronise avec Firebase Auth
 * si l'administrateur mis à jour est l'utilisateur actuellement connecté.
 */
export async function updateAdminProfile(db: Firestore, auth: Auth, id: string, updates: Partial<Admin>): Promise<void> {
    const adminDocRef = doc(db, ADMINS_COLLECTION, id);
    await updateDoc(adminDocRef, updates);

    // Synchronisation avec Firebase Auth uniquement si c'est l'utilisateur connecté lui-même
    try {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === id) {
            // Reconstitution du displayName (Prénom Nom)
            const prenom = updates.prenom !== undefined ? updates.prenom : (currentUser.displayName?.split(' ')[0] || '');
            const nom = updates.nom !== undefined ? updates.nom : (currentUser.displayName?.split(' ').slice(1).join(' ') || '');
            
            const newDisplayName = `${prenom} ${nom}`.trim();
            
            if (newDisplayName && newDisplayName !== currentUser.displayName) {
                await updateProfile(currentUser, {
                    displayName: newDisplayName
                });
            }
        }
    } catch (authError) {
        // On ne bloque pas la mise à jour Firestore si la mise à jour du profil Auth échoue
        console.warn("Échec de la synchronisation avec le profil Firebase Auth:", authError);
    }
}

/**
 * Supprime un profil administrateur de Firestore.
 */
export async function deleteAdminProfile(db: Firestore, id: string): Promise<void> {
    await deleteDoc(doc(db, ADMINS_COLLECTION, id));
}
