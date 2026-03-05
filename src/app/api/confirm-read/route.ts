import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { jeton } = await request.json();

    if (!jeton) {
      return NextResponse.json({ success: false, error: "Jeton manquant." }, { status: 400 });
    }

    // Initialisation Firebase côté serveur
    const { firestore } = initializeFirebase();
    const trackingRef = doc(firestore, 'email_tracking', jeton);
    const trackingSnap = await getDoc(trackingRef);

    if (!trackingSnap.exists()) {
      console.error(`[API confirm-read] Jeton non trouvé dans Firestore: ${jeton}`);
      return NextResponse.json({ success: false, error: "Lien invalide ou expiré." }, { status: 404 });
    }

    // On procède à la mise à jour quoi qu'il arrive pour confirmer la réception
    // Les règles Firestore autorisent cette mise à jour publique sur ces deux champs précis.
    await updateDoc(trackingRef, {
      statut: 'confirmé',
      dateLecture: new Date().toISOString()
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[API confirm-read] Erreur critique:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Une erreur est survenue lors de la validation." 
    }, { status: 500 });
  }
}
