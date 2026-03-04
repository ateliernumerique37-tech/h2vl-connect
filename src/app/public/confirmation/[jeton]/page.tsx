
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!jeton) return;

    const confirmReception = async () => {
      try {
        const { firestore } = initializeFirebase();
        const docRef = doc(firestore, 'email_tracking', jeton);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          await updateDoc(docRef, {
            statut: 'confirmé',
            dateLecture: new Date().toISOString()
          });
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error("Confirmation error:", error);
        setStatus('error');
      }
    };

    confirmReception();
  }, [jeton]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && "Validation en cours..."}
            {status === 'success' && "Lecture confirmée !"}
            {status === 'error' && "Lien invalide"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <p className="text-muted-foreground text-lg">
            {status === 'loading' && "Veuillez patienter quelques instants."}
            {status === 'success' && "Merci ! Nous avons bien enregistré votre lecture. À bientôt chez H2VL."}
            {status === 'error' && "Ce lien de confirmation semble expiré ou incorrect."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
