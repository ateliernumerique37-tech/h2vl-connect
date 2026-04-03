'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!jeton) return;

    const validateToken = async () => {
      try {
        const { firestore: db } = initializeFirebase();
        
        // On cherche le document dont l'ID est le jeton
        const docRef = doc(db, 'email_tracking', jeton);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Mise à jour du statut
          await updateDoc(docRef, {
            statut: 'confirmé',
            dateLecture: new Date().toISOString()
          });
          setStatus('success');
        } else {
          console.warn(`Jeton non trouvé dans Firestore: ${jeton}`);
          setStatus('error');
          setErrorDetails('NOT_FOUND');
        }
      } catch (err: any) {
        console.error("Validation error:", err);
        setStatus('error');
        setErrorDetails(err.message);
      }
    };

    validateToken();
  }, [jeton]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Mail className="h-16 w-16 text-primary/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                {status === 'loading' && <Loader2 className="h-8 w-8 text-primary animate-spin" />}
                {status === 'success' && <CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />}
                {status === 'error' && <AlertCircle className="h-10 w-10 text-destructive animate-in shake duration-300" />}
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {status === 'loading' && "Vérification..."}
            {status === 'success' && "Réception confirmée !"}
            {status === 'error' && "Lien invalide"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6 pt-4">
          <p className="text-muted-foreground text-lg leading-relaxed">
            {status === 'loading' && "Nous validons votre accusé de réception, merci de patienter un instant."}
            {status === 'success' && "Merci ! Nous avons bien enregistré votre lecture. À bientôt chez H2VL."}
            {status === 'error' && "Désolé, ce lien de confirmation n'est pas valide ou n'a pas encore été synchronisé."}
          </p>

          {status === 'success' && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm font-medium border border-green-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
              Votre participation nous aide à mieux organiser la vie de l'association.
            </div>
          )}

          {status === 'error' && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left">
              <p className="font-bold text-xs mb-2 uppercase tracking-widest text-muted-foreground">Diagnostic Technique</p>
              <div className="space-y-1 font-mono text-[10px] break-all">
                <p><span className="text-primary">JETON:</span> {jeton || 'manquant'}</p>
                <p><span className="text-primary">STATUS:</span> {errorDetails || 'N/A'}</p>
              </div>
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
