'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Loader2, CalendarDays, XCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type PageStatus = 'loading' | 'confirming' | 'cancelling' | 'success' | 'already_cancelled' | 'error';

function AnnulationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;

  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!jeton) return;

    const loadToken = async () => {
      try {
        const { firestore: db } = initializeFirebase();

        const tokenSnap = await getDoc(doc(db, 'annulations_inscription', jeton));

        if (!tokenSnap.exists()) {
          setStatus('error');
          setErrorDetails('NOT_FOUND');
          return;
        }

        const tokenData = tokenSnap.data();

        if (tokenData.utilisé) {
          setEventTitle(tokenData.eventTitle || null);
          setStatus('already_cancelled');
          return;
        }

        setEventTitle(tokenData.eventTitle || null);
        setStatus('confirming');
      } catch (err: any) {
        console.error('Annulation load error:', err);
        setStatus('error');
        setErrorDetails(err.message);
      }
    };

    loadToken();
  }, [jeton]);

  const handleConfirmCancellation = async () => {
    setStatus('cancelling');
    try {
      const res = await fetch('/api/cancel-inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'ALREADY_CANCELLED') {
          setStatus('already_cancelled');
        } else {
          setStatus('error');
          setErrorDetails(data.error || 'Erreur inconnue');
        }
        return;
      }

      setStatus('success');
    } catch (err: any) {
      console.error('Annulation error:', err);
      setStatus('error');
      setErrorDetails(err.message);
    }
  };

  // ── Formulaire de confirmation ────────────────────────────────────────────
  if (status === 'confirming' || status === 'cancelling') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4" aria-hidden="true">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-9 w-9 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Annuler mon inscription
            </CardTitle>
          </CardHeader>

          <CardContent className="text-center space-y-4 pt-2">
            <p className="text-muted-foreground text-base leading-relaxed">
              Vous êtes sur le point d'annuler votre inscription. Cette action est définitive.
            </p>
            {eventTitle && (
              <div
                className="rounded-xl bg-red-50 border border-red-100 p-4 text-left space-y-1"
                role="region"
                aria-label="Événement concerné"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {eventTitle}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              variant="destructive"
              className="w-full h-12 text-base font-semibold focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              onClick={handleConfirmCancellation}
              disabled={status === 'cancelling'}
              aria-label="Confirmer l'annulation de mon inscription"
            >
              {status === 'cancelling' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Annulation en cours…
                </>
              ) : (
                'Confirmer l\'annulation'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Si vous avez fermé cette page par erreur, ignorez simplement ce message — votre inscription reste valide.
            </p>
          </CardFooter>
        </Card>
      </main>
    );
  }

  // ── États finaux ─────────────────────────────────────────────────────────
  const config: Record<Exclude<PageStatus, 'confirming' | 'cancelling'>, {
    icon: React.ReactNode;
    title: string;
    description: string;
    bgClass: string;
  }> = {
    loading: {
      icon: <Loader2 className="h-8 w-8 text-primary animate-spin" />,
      title: 'Chargement…',
      description: 'Vérification du lien en cours.',
      bgClass: 'bg-primary/10',
    },
    success: {
      icon: <CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />,
      title: 'Inscription annulée',
      description: 'Votre désinscription a bien été enregistrée. Nous espérons vous voir à un prochain événement !',
      bgClass: 'bg-green-100',
    },
    already_cancelled: {
      icon: <AlertCircle className="h-10 w-10 text-orange-500" />,
      title: 'Déjà annulée',
      description: 'Cette inscription a déjà été annulée.',
      bgClass: 'bg-orange-100',
    },
    error: {
      icon: <AlertCircle className="h-10 w-10 text-destructive" />,
      title: 'Lien invalide',
      description: "Ce lien n'est pas valide ou a expiré.",
      bgClass: 'bg-destructive/10',
    },
  };

  const safeStatus = status as Exclude<PageStatus, 'confirming' | 'cancelling'>;
  const { icon, title, description, bgClass } = config[safeStatus];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6" aria-hidden="true">
            <div className={`h-16 w-16 rounded-full ${bgClass} flex items-center justify-center`}>
              {icon}
            </div>
          </div>
          <CardTitle
            className="text-2xl font-bold tracking-tight"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4 pt-2">
          <p className="text-muted-foreground text-base leading-relaxed">
            {description}
          </p>
          {status === 'success' && eventTitle && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm text-green-700 font-medium">
              {eventTitle}
            </div>
          )}
          {status === 'already_cancelled' && eventTitle && (
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-sm text-orange-700 font-medium">
              {eventTitle}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-2 p-4 bg-muted/50 rounded-lg text-left" role="region" aria-label="Informations de diagnostic">
              <p className="font-bold text-xs mb-2 uppercase tracking-widest text-muted-foreground" aria-hidden="true">Diagnostic</p>
              <dl className="space-y-1 font-mono text-[10px] break-all">
                <div className="flex gap-1">
                  <dt className="text-primary">Jeton :</dt>
                  <dd>{jeton || 'manquant'}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-primary">Erreur :</dt>
                  <dd>{errorDetails || 'N/A'}</dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function AnnulationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Chargement en cours">
        <Loader2 className="h-12 w-12 text-primary animate-spin" aria-hidden="true" />
      </div>
    }>
      <AnnulationContent />
    </Suspense>
  );
}
