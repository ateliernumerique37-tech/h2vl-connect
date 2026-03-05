'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Logo } from '@/components/icons';

export const dynamic = 'force-dynamic';

/**
 * Composant de contenu pour la confirmation.
 * Extrait du layout racine pour bénéficier de Suspense et éviter les erreurs Next.js 15.
 */
function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    async function validateToken() {
      if (!jeton) {
        setStatus('error');
        setMessage("Le lien est incomplet (jeton manquant dans l'URL).");
        return;
      }

      try {
        // On appelle l'API interne qui gère la communication avec Firestore
        const response = await fetch('/api/confirm-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jeton }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.error || "Une erreur est survenue lors de la validation.");
          setDebugInfo({ 
            httpCode: response.status, 
            jeton,
            serverError: data.details || data.error,
            stack: data.stack 
          });
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setStatus('error');
        setMessage("Erreur technique de connexion au serveur : " + err.message);
        setDebugInfo({ error: err.message, stack: err.stack });
      }
    }

    // Un léger délai peut être utile si Firestore vient juste de créer le doc via l'API d'envoi
    const timer = setTimeout(validateToken, 500);
    return () => clearTimeout(timer);
  }, [jeton]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md shadow-lg border-2">
        <CardHeader className="text-center pb-2">
          <div className="mb-4 flex justify-center">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Accusé de réception</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6 pt-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse font-medium">Validation de votre message en cours...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Merci !</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Nous avons bien enregistré votre lecture. <br/>
                  À bientôt chez <strong>H2VL</strong>. ✨
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="space-y-3">
                <p className="text-foreground font-semibold leading-tight px-4">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Si le problème persiste, vous pouvez simplement fermer cette page. <br/>
                  Votre lecture sera peut-être validée manuellement ultérieurement.
                </p>
              </div>
              
              {/* Panneau de Diagnostic Technique */}
              <div className="mt-6 w-full text-left bg-muted p-4 rounded-lg border text-[10px] font-mono overflow-hidden max-h-[200px] overflow-y-auto shadow-inner">
                <div className="flex items-center gap-2 mb-2 text-primary border-b pb-1">
                  <Info className="h-3 w-3" />
                  <span className="font-bold uppercase tracking-wider">Diagnostic Technique (Debug)</span>
                </div>
                <div className="space-y-1 text-muted-foreground break-all whitespace-pre-wrap">
                  <div>CODE_HTTP: {debugInfo?.httpCode || 'N/A'}</div>
                  <div>JETON_ID: {debugInfo?.jeton || jeton || 'Inconnu'}</div>
                  <div>MESSAGE: {debugInfo?.serverError || 'Aucun détail fourni par le serveur.'}</div>
                  {debugInfo?.stack && (
                    <div className="mt-2 pt-2 border-t border-muted-foreground/20 text-[8px] opacity-50">
                      STACK_TRACE: {debugInfo.stack}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TokenConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
