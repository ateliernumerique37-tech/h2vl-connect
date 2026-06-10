import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  // Firebase App Hosting injecte automatiquement les credentials (ADC + FIREBASE_CONFIG).
  // En développement local, définir GOOGLE_APPLICATION_CREDENTIALS.
  return initializeApp();
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

/**
 * Vérifie qu'une requête API provient d'un administrateur authentifié ayant le rôle
 * 'Administrateur'. À utiliser sur toute route effectuant une action réservée aux
 * Administrateurs (gestion des comptes admin). Ne jamais se reposer sur le masquage UI.
 *
 * Lève une erreur :
 *  - 'UNAUTHORIZED' si le Bearer token est absent ou invalide
 *  - 'FORBIDDEN' si l'appelant n'est pas un Administrateur
 * Retourne le token décodé en cas de succès.
 */
export async function requireAdministrateur(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('UNAUTHORIZED');

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new Error('UNAUTHORIZED');
  }

  const snap = await adminDb().collection('admins').doc(decoded.uid).get();
  if (!snap.exists || snap.data()?.role !== 'Administrateur') {
    throw new Error('FORBIDDEN');
  }

  return decoded;
}

/** Traduit l'erreur de requireAdministrateur en réponse HTTP (401/403). */
export function authErrorStatus(error: unknown): number {
  return (error as Error)?.message === 'FORBIDDEN' ? 403 : 401;
}
