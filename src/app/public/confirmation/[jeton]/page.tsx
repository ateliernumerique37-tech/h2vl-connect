'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { Logo } from '@/components/icons';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Composant interne gérant la logique de confirmation.
 */
function ConfirmationContent({ jeton }: { jeton: string }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!jeton) return;

    const confirmRead = async () => {
      try {
        console.log('Client: Tentative de confirmation pour le jeton:', jeton);
        
        const response = await fetch('/api/confirm-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jeton }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('Client: Confirmation réussie');
          setStatus('success');
        } else {
          console.error('Client: Erreur retournée par l\'API:', data.error);
          setStatus('error');
          setErrorMsg(data.error || 'Lien invalide ou expiré.');
        }
      } catch (err) {
        console.error('Client: Erreur lors de l\'appel API:', err);
        setStatus('error');
        setErrorMsg('Une erreur technique est survenue.');
      }
    };

    // Petit délai pour laisser à Firestore le temps de propager l'écriture initiale du jeton
    const timer = setTimeout(confirmRead, 500);
    return () => clearTimeout(timer);
  }, [jeton]);

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
      {status === 'loading' && (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground">Vérification de votre message...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Merci !</h2>
          <p className="text-muted-foreground">
            Nous avons bien enregistré votre lecture.<br />
            À bientôt chez <strong>H2VL</strong>.
          </p>
          <p className="text-[10px] text-muted-foreground pt-6 italic uppercase tracking-wider">
            Vous pouvez maintenant fermer cette fenêtre.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Oups...</h2>
          <p className="text-muted-foreground">{errorMsg}</p>
          <p className="text-xs text-muted-foreground pt-4">
            Si vous avez déjà cliqué sur ce lien, votre lecture est déjà enregistrée.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Page de destination publique pour l'accusé de réception des e-mails.
 */
export default function ConfirmationPage({ params }: { params: Promise<{ jeton: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8">
        <Logo className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-primary tracking-tight">H2VL Connect</h1>
      </div>

      <Suspense fallback={<div className="p-8"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary opacity-20" /></div>}>
        <ConfirmationContent jeton={resolvedParams.jeton} />
      </Suspense>
      
      <footer className="mt-8 text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
        &copy; {new Date().getFullYear()} Association H2VL
      </footer>
    </div>
  );
}
