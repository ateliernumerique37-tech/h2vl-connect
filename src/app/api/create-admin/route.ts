import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Vérification que l'appelant est un admin connecté
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 });
    }
    await adminAuth().verifyIdToken(token);

    const { prenom, nom, email, role, password } = await request.json();

    if (!email || !password || !prenom || !nom || !role) {
      return NextResponse.json({ success: false, error: 'Tous les champs sont obligatoires.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' }, { status: 400 });
    }

    // Créer le compte Firebase Auth
    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: `${prenom} ${nom}`,
    });

    // Créer le doc Firestore avec l'UID comme identifiant (obligatoire pour les règles isAdmin)
    await adminDb().collection('admins').doc(userRecord.uid).set({
      prenom,
      nom,
      email,
      role,
      dateCreation: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error('[create-admin]', error);

    // Messages d'erreur Firebase Auth lisibles
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ success: false, error: 'Cette adresse email est déjà utilisée.' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}
