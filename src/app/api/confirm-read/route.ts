import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Route API serveur pour valider la lecture d'un e-mail.
 * S'exécute côté serveur pour contourner les restrictions potentielles du navigateur
 * et garantir une exécution robuste même sans authentification utilisateur.
 */
export async function POST(request: Request) {
  try {
    const { jeton } = await request.json();

    if (!jeton) {
      console.error('[API confirm-read] Requête rejetée : Jeton manquant.');
      return NextResponse.json({ success: false, error: "Jeton de sécurité manquant." }, { status: 400 });
    }

    // Initialisation du SDK Firebase
    const { firestore } = initializeFirebase();
    const trackingRef = doc(firestore, 'email_tracking', jeton);
    
    // Tentative de récupération du document de suivi
    const trackingSnap = await getDoc(trackingRef);

    if (!trackingSnap.exists()) {
      console.error(`[API confirm-read] Jeton inconnu ou supprimé : ${jeton}`);
      return NextResponse.json({ 
        success: false, 
        error: "Lien invalide ou expiré (Document non trouvé dans la base)." 
      }, { status: 404 });
    }

    // Mise à jour du statut en 'confirmé'
    // On ne bloque pas si le statut est déjà confirmé (permet le double-clic ou le rafraîchissement)
    try {
      await updateDoc(trackingRef, {
        statut: 'confirmé',
        dateLecture: new Date().toISOString()
      });
      
      console.log(`[API confirm-read] Succès : Jeton ${jeton} marqué comme lu.`);
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (fsError: any) {
      console.error(`[API confirm-read] Erreur Firestore lors de l'écriture:`, fsError);
      return NextResponse.json({ 
        success: false, 
        error: `Erreur base de données: ${fsError.message || 'Permission refusée'}` 
      }, { status: 403 });
    }

  } catch (error: any) {
    console.error('[API confirm-read] Erreur critique système:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Une erreur interne est survenue lors de la validation." 
    }, { status: 500 });
  }
}