import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Authentification : Bearer token Firebase Auth obligatoire
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 });
    }

    let callerUid: string;
    try {
      const decoded = await adminAuth().verifyIdToken(token);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 });
    }

    const { uid, password } = await request.json();

    if (!uid || !password) {
      return NextResponse.json({ success: false, error: 'UID et mot de passe requis.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' }, { status: 400 });
    }

    // Autorisation : on peut changer SON PROPRE mot de passe, sinon il faut être Administrateur
    if (uid !== callerUid) {
      const callerSnap = await adminDb().collection('admins').doc(callerUid).get();
      if (!callerSnap.exists || callerSnap.data()?.role !== 'Administrateur') {
        return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 403 });
      }
    }

    await adminAuth().updateUser(uid, { password });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[update-admin-password]', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
