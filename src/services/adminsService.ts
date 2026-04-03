'use client';
import { doc, updateDoc, type Firestore } from 'firebase/firestore';
import { updateProfile, type Auth } from 'firebase/auth';
import type { Admin } from '@/lib/types';

/**
 * Récupère le token d'authentification de l'utilisateur courant.
 */
async function getIdToken(auth: Auth): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté.');
  return user.getIdToken();
}

/**
 * Crée un compte Firebase Auth + profil Firestore via l'API sécurisée.
 * Le doc Firestore est créé avec l'UID Firebase Auth comme identifiant.
 */
export async function createAdminProfile(
  auth: Auth,
  adminData: Omit<Admin, 'id' | 'dateCreation'> & { password: string }
): Promise<void> {
  const token = await getIdToken(auth);

  const res = await fetch('/api/create-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(adminData),
  });

  const result = await res.json();
  if (!result.success) throw new Error(result.error);
}

/**
 * Met à jour un profil administrateur existant (nom, prénom, rôle uniquement).
 */
export async function updateAdminProfile(db: Firestore, auth: Auth, id: string, updates: Partial<Admin>): Promise<void> {
  const adminDocRef = doc(db, 'admins', id);

  const allowedUpdates: any = {};
  if (updates.prenom !== undefined) allowedUpdates.prenom = updates.prenom;
  if (updates.nom !== undefined) allowedUpdates.nom = updates.nom;
  if (updates.role !== undefined) allowedUpdates.role = updates.role;

  await updateDoc(adminDocRef, allowedUpdates);

  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === id) {
      const prenom = allowedUpdates.prenom ?? currentUser.displayName?.split(' ')[0] ?? '';
      const nom = allowedUpdates.nom ?? currentUser.displayName?.split(' ').slice(1).join(' ') ?? '';
      const newDisplayName = `${prenom} ${nom}`.trim();
      if (newDisplayName && newDisplayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: newDisplayName });
      }
    }
  } catch {
    // Erreur non bloquante sur le displayName Auth
  }
}

/**
 * Supprime le compte Firebase Auth + le profil Firestore via l'API sécurisée.
 * Refuse la suppression si c'est le dernier admin.
 */
export async function deleteAdminProfile(auth: Auth, uid: string): Promise<void> {
  const token = await getIdToken(auth);

  const res = await fetch('/api/delete-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ uid }),
  });

  const result = await res.json();
  if (!result.success) throw new Error(result.error);
}
