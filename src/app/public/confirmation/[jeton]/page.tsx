'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ConfirmationContent() {
  const params = useParams();
  const db = useFirestore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const confirmRead = async () => {
      const jeton = params?.jeton as string;
      
      if (!jeton || !db) {
        if (!jeton) setErrorMessage("Jeton manquant dans l'URL.");
        return;
      }

      try {
        console.log('[Confirmation] Tentative de validation pour:', jeton);
        
        // 1. Recherche du document par le champ 'jeton'
        const q = query(collection(db, 'email_tracking'), where('jeton', '==', jeton));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error('[Confirmation] Jeton inconnu:', jeton);
          setStatus('error');
          setErrorMessage("Lien invalide ou expiré (Document non trouvé).");
          setDebugInfo({ jeton, reason: 'NOT_FOUND' });
          return;
        }

        // 2. Mise à jour du document (on prend le premier trouvé)
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          statut: 'confirmé',
          dateLecture: serverTimestamp()
        });

        console.log('[Confirmation] Succès pour:', jeton);
        setStatus('success');
      } catch (error: any) {
        console.error('[Confirmation] Erreur Firestore:', error);
        setStatus('error');
        setErrorMessage(error.message || "Une erreur technique est survenue.");
        setDebugInfo({ 
          jeton, 
          code: error.code, 
          message: error.message 
        });
      }
    };

    confirmRead();
  }, [params?.jeton, db]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">H2VL Connect</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
              <p className="text-muted-foreground animate-pulse">Validation de votre message...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Merci !</h3>
                <p className="text-slate-600 leading-relaxed">
                  Nous avons bien enregistré votre lecture.<br />
                  À bientôt chez <strong>H2VL</strong>.
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-red-900">Oups !</h3>
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>

              {debugInfo && (
                <div className="mt-8 rounded-lg bg-slate-900 p-4 font-mono text-[10px] text-slate-300 overflow-hidden">
                  <p className="text-slate-500 mb-2 border-b border-slate-800 pb-1 uppercase tracking-widest font-bold">Diagnostic Technique</p>
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
