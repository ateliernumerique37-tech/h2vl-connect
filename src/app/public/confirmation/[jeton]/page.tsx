
'use client';

import { useEffect, useState, use } from 'react';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ jeton: string }>;
}

export default function ConfirmationPage({ params }: PageProps) {
  const { jeton } = use(params);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!jeton) return;

    const validateJeton = async (retryCount = 0) => {
      console.log(`[Diagnostic] Tentative de validation #${retryCount + 1} - Jeton:`, jeton);
      
      try {
        const { firestore } = initializeFirebase();
        // Le jeton est utilisé comme ID de document dans la collection email_tracking
        const docRef = doc(firestore, 'email_tracking', jeton);
        const docSnap = await getDoc(docRef);

        console.log(`[Diagnostic] Document trouvé dans Firestore:`, docSnap.exists());

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log(`[Diagnostic] Données du document:`, data);

          // On met à jour le statut sur 'confirmé'
          // On ne bloque pas si c'est déjà confirmé pour éviter les erreurs de double-clic ou rafraîchissement
          await updateDoc(docRef, {
            statut: 'confirmé',
            dateLecture: new Date().toISOString()
          });
          
          console.log(`[Diagnostic] Mise à jour réussie.`);
          setStatus('success');
        } else if (retryCount < 2) {
          // Si pas trouvé immédiatement, on réessaie après un délai (cas de latence d'écriture Firestore)
          console.log(`[Diagnostic] Document non trouvé, nouvel essai dans 1.5s...`);
          setTimeout(() => validateJeton(retryCount + 1), 1500);
        } else {
          console.error(`[Diagnostic] Erreur fatale: Document inexistant pour le jeton ${jeton}`);
          setStatus('error');
          setErrorMessage('Lien invalide ou expiré.');
        }
      } catch (error: any) {
        console.error(`[Diagnostic] Erreur système lors de la lecture Firestore:`, error);
        setStatus('error');
        setErrorMessage('Une erreur technique est survenue.');
      }
    };

    validateJeton();
  }, [jeton]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-2 shadow-xl overflow-hidden">
        <CardHeader className="text-center border-b bg-primary/5 py-6">
          <CardTitle className="text-2xl font-bold text-primary tracking-tight">H2VL Connect</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-12 px-6 text-center">
          {status === 'loading' && (
            <div className="space-y-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto opacity-40" />
              <div className="space-y-2">
                <p className="text-xl font-semibold text-foreground">Traitement de votre demande...</p>
                <p className="text-sm text-muted-foreground">Merci de patienter un instant.</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-700">
              <div className="rounded-full bg-green-50 p-5 mx-auto w-fit border border-green-100 shadow-sm">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Merci !</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Votre lecture a été enregistrée avec succès. <br />
                  À très bientôt chez <strong>H2VL</strong>.
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="rounded-full bg-red-50 p-5 mx-auto w-fit border border-red-100 shadow-sm">
                <AlertCircle className="h-16 w-16 text-red-600" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-red-600">Lien invalide</h2>
                <p className="text-muted-foreground font-medium">{errorMessage}</p>
              </div>
              <div className="pt-6 border-t w-full">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  Si vous pensez qu'il s'agit d'une erreur, merci de signaler le problème au Bureau de l'association lors de votre prochaine visite.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
