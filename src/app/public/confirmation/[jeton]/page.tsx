
'use client';

/**
 * @fileOverview Page de confirmation publique pour l'accusé de réception des e-mails.
 * Cette page est accessible sans authentification via un jeton unique.
 */

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Logo } from '@/components/icons';

function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!jeton) return;

    const confirmReading = async () => {
      try {
        const { firestore } = initializeFirebase();
        const trackingRef = doc(firestore, 'email_tracking', jeton);
        
        // Mise à jour du statut dans Firestore
        await updateDoc(trackingRef, {
          statut: 'confirmé',
          dateLecture: new Date().toISOString()
        });
        
        setStatus('success');
      } catch (error) {
        console.error("Erreur de confirmation:", error);
        setStatus('error');
      }
    };

    confirmReading();
  }, [jeton]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Validation de votre lecture...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="rounded-full bg-destructive/10 p-4">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Lien invalide</h1>
          <p className="text-muted-foreground">
            Nous n'avons pas pu valider cet accusé de réception. Le lien est peut-être expiré ou a déjà été utilisé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center animate-in fade-in zoom-in duration-700 max-w-lg">
      <div className="rounded-full bg-green-50 p-6 border-4 border-green-100">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
      </div>
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold text-primary tracking-tight">Merci !</h1>
        <div className="space-y-2">
          <p className="text-xl text-muted-foreground leading-relaxed">
            Nous avons bien enregistré votre lecture. Votre confirmation aide l'association dans sa gestion quotidienne.
          </p>
          <p className="text-2xl font-bold text-primary/90 mt-4 italic">
            À bientôt chez H2VL ✨
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-12 flex items-center gap-3">
        <Logo className="h-10 w-10 text-primary" />
        <span className="text-2xl font-bold text-primary">H2VL Connect</span>
      </div>
      
      <main className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-10 md:p-16">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        }>
          <ConfirmationContent />
        </Suspense>
      </main>
      
      <footer className="mt-12 text-slate-400 text-sm">
        © {new Date().getFullYear()} Association H2VL - Tous droits réservés.
      </footer>
    </div>
  );
}
