import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Route API serveur pour valider la lecture d'un e-mail.
 * S'exécute côté serveur pour garantir une exécution robuste même sans authentification utilisateur.
 * Utilise le SDK Client configuré pour le serveur (autorisé par les règles publiques).
 */
export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const { jeton } = body;

    if (!jeton) {
      console.error('[API confirm-read] Requête rejetée : Jeton manquant.');
      return NextResponse.json({ success: false, error: "Jeton de sécurité manquant." }, { status: 400 });
    }

    // Initialisation du SDK Firebase (Client SDK utilisé côté serveur)
    let firestore;
    try {
      const sdk = initializeFirebase();
      firestore = sdk.firestore;
    } catch (initErr: any) {
      console.error('[API confirm-read] Crash initialisation Firebase:', initErr);
      return NextResponse.json({ 
        success: false, 
        error: "Échec initialisation Firebase sur le serveur.",
        details: initErr.message,
        stack: initErr.stack
      }, { status: 500 });
    }

    // On utilise le jeton comme identifiant unique du document
    const trackingRef = doc(firestore, 'email_tracking', jeton);
    
    // Tentative de récupération du document de suivi
    let trackingSnap;
    try {
      trackingSnap = await getDoc(trackingRef);
    } catch (readErr: any) {
      console.error('[API confirm-read] Erreur lecture Firestore:', readErr);
      return NextResponse.json({ 
        success: false, 
        error: "Erreur lecture base de données (Permissions ?)",
        details: readErr.message,
        stack: readErr.stack
      }, { status: 500 });
    }

    if (!trackingSnap.exists()) {
      console.error(`[API confirm-read] Jeton inconnu ou supprimé : ${jeton}`);
      return NextResponse.json({ 
        success: false, 
        error: `Lien invalide ou expiré (Jeton non trouvé dans la base: ${jeton})` 
      }, { status: 404 });
    }

    // Mise à jour du statut en 'confirmé'
    // Note: Les règles Firestore doivent autoriser l'accès public à cette collection.
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
        error: "Échec de l'écriture dans Firestore. Vérifiez les règles de sécurité.",
        details: fsError.message,
        stack: fsError.stack
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API confirm-read] Erreur critique système:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Une erreur interne est survenue lors de la validation.",
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
