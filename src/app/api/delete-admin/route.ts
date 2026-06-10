import { NextResponse } from 'next/server';
import { adminAuth, adminDb, requireAdministrateur, authErrorStatus } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Action réservée aux Administrateurs (suppression de comptes admin)
    try {
      await requireAdministrateur(request);
    } catch (authErr) {
      return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: authErrorStatus(authErr) });
    }

    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ success: false, error: 'UID manquant.' }, { status: 400 });
    }

    // Protection : toujours garder au moins un admin
    const adminsSnap = await adminDb().collection('admins').get();
    if (adminsSnap.size <= 1) {
      return NextResponse.json({
        success: false,
        error: 'Impossible de supprimer le dernier administrateur.',
      }, { status: 400 });
    }

    // Supprimer le compte Firebase Auth (si existant)
    try {
      await adminAuth().deleteUser(uid);
    } catch (authError: any) {
      // Si l'utilisateur n'existe pas dans Auth (ancien doc avec ID aléatoire), on continue
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // Supprimer le doc Firestore
    await adminDb().collection('admins').doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[delete-admin]', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
