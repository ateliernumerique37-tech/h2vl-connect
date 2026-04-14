import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 });
    }
    await adminAuth().verifyIdToken(token);

    const { uid, password } = await request.json();

    if (!uid || !password) {
      return NextResponse.json({ success: false, error: 'UID et mot de passe requis.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' }, { status: 400 });
    }

    await adminAuth().updateUser(uid, { password });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[update-admin-password]', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
