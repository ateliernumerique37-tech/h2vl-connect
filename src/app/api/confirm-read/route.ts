import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { jeton } = await request.json();

    if (!jeton) {
      console.error('[API confirm-read] Jeton manquant dans le corps de la requête.');
      return NextResponse.json({ success: false, error: "Jeton manquant." }, { status: 400 });
    }

    // Initialisation Firebase côté serveur
    const { firestore } = initializeFirebase();
    const trackingRef = doc(firestore, 'email_tracking', jeton);
    
    // On essaie de récupérer le document pour vérifier son existence
    const trackingSnap = await getDoc(trackingRef);

    if (!trackingSnap.exists()) {
      console.error(`[API confirm-read] Document non trouvé pour le jeton: ${jeton}`);
      return NextResponse.json({ success: false, error: "Lien invalide ou expiré." }, { status: 404 });
    }

    // Mise à jour du statut (autorisée par les règles Firestore publiques sur ces deux champs)
    await updateDoc(trackingRef, {
      statut: 'confirmé',
      dateLecture: new Date().toISOString()
    });

    console.log(`[API confirm-read] Succès: Jeton ${jeton} confirmé.`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[API confirm-read] Erreur critique lors de la validation:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Une erreur est survenue lors de la validation." 
    }, { status: 500 });
  }
}
