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
