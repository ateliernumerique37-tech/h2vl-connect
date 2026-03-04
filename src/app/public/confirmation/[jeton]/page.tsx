
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, MailCheck, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/icons';

export const dynamic = 'force-dynamic';

function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const db = useFirestore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Validation de votre lecture...');

  useEffect(() => {
    if (!jeton || !db) return;

    const validateTracking = async () => {
      try {
        const docRef = doc(db, 'email_tracking', jeton);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.statut === 'confirmé') {
            setStatus('success');
            setMessage('Votre réception était déjà confirmée. Merci !');
            return;
          }

          // Mise à jour du statut
          await updateDoc(docRef, {
            statut: 'confirmé',
            dateLecture: new Date().toISOString()
          });

          setStatus('success');
          setMessage('Merci ! Nous avons bien enregistré votre lecture. À bientôt chez H2VL.');
        } else {
          setStatus('error');
          setMessage('Lien de confirmation invalide ou expiré.');
        }
      } catch (error) {
        console.error("Confirmation error:", error);
        setStatus('error');
        setMessage('Une erreur est survenue lors de la confirmation.');
      }
    };

    validateTracking();
  }, [jeton, db]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Logo className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">H2VL Connect</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary opacity-50" />
              <p className="text-muted-foreground font-medium">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Réception confirmée</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-destructive">Oups !</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Ceci est un message automatique de l'association H2VL.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
