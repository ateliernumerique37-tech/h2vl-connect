import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { jeton } = await request.json();

    if (!jeton) {
      return NextResponse.json({ success: false, error: 'Jeton manquant.' }, { status: 400 });
    }

    const db = adminDb();

    // 1. Lire le jeton d'annulation
    const tokenRef = db.collection('annulations_inscription').doc(jeton);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const tokenData = tokenSnap.data()!;

    // 2. Vérifier que le jeton n'a pas déjà été utilisé
    if (tokenData.utilisé) {
      return NextResponse.json({ success: false, error: 'ALREADY_CANCELLED' }, { status: 409 });
    }

    // 3. Supprimer l'inscription (via Admin SDK, contourne les règles Firestore)
    await db.collection('inscriptions').doc(tokenData.inscriptionId).delete();

    // 4. Marquer le jeton comme utilisé pour empêcher la réutilisation
    await tokenRef.update({
      utilisé: true,
      dateAnnulation: new Date().toISOString(),
    });

    // 5. Remettre l'invitation à "envoyé" pour que le lien redevienne utilisable
    if (tokenData.jetonInvitation) {
      await db.collection('invitations_evenement').doc(tokenData.jetonInvitation).update({
        statut: 'envoyé',
        dateInscription: null,
      });
    }

    return NextResponse.json({
      success: true,
      eventTitle: tokenData.eventTitle || '',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Cancel inscription error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || "Erreur lors de l'annulation.",
    }, { status: 500 });
  }
}
