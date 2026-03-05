'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

/**
 * Page de confirmation publique isolée de la PWA.
 * Cette page permet aux adhérents de valider la lecture d'un e-mail.
 * Forcée en mode dynamique pour éviter les erreurs de build Next.js 15.
 */
export const dynamic = 'force-dynamic';

function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    async function performValidation() {
      if (!jeton) {
        setStatus('error');
        setMessage('Jeton de sécurité manquant dans l\'URL.');
        return;
      }

      console.log('[Confirmation] Lancement de la validation pour le jeton:', jeton);

      try {
        // On appelle la route API interne qui gère la communication avec Firestore
        const response = await fetch('/api/confirm-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jeton }),
        });

        const data = await response.json();
        setDebugInfo({
          httpStatus: response.status,
          success: data.success,
          error: data.error
        });

        if (response.ok && data.success) {
          console.log('[Confirmation] Réponse API positive');
          setStatus('success');
          setMessage('Merci ! Nous avons bien enregistré votre lecture. À bientôt chez H2VL.');
        } else {
          console.error('[Confirmation] Échec API:', data.error);
          setStatus('error');
          setMessage(data.error || 'Le lien semble invalide ou a expiré.');
        }
      } catch (err: any) {
        console.error('[Confirmation] Erreur réseau ou technique:', err);
        setStatus('error');
        setMessage('Erreur technique : ' + (err.message || 'Impossible de joindre le serveur de validation.'));
      }
    }

    // Délai de courtoisie de 500ms pour s'assurer que Firestore a bien indexé le document créé lors de l'envoi du mail
    const timer = setTimeout(performValidation, 500);
    return () => clearTimeout(timer);
  }, [jeton]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="mx-auto w-full max-w-md border-2 shadow-2xl overflow-hidden bg-white">
        <CardHeader className="text-center bg-primary/5 pb-6 pt-8 border-b">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-white p-4 shadow-sm border border-primary/10">
              <Logo className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-primary uppercase">H2VL Connect</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-8 text-center px-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-700">Validation en cours...</p>
                <p className="text-sm text-muted-foreground italic">Vérification de votre accusé de réception...</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-6 py-6 animate-in fade-in zoom-in duration-700">
              <div className="rounded-full bg-green-100 p-4 ring-8 ring-green-50">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-3">
                <p className="text-xl font-bold text-slate-900 leading-tight">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Votre confirmation a été transmise au Bureau de l'association.
                </p>
              </div>
              <div className="mt-4 pt-6 border-t w-full text-slate-400 text-[10px] italic">
                ✨ Propulsé par EVA, l'assistante de H2VL
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-6 py-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="rounded-full bg-red-100 p-4 ring-8 ring-red-50">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <div className="space-y-3">
                <p className="text-xl font-bold text-red-800">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Si ce problème persiste, merci de contacter un administrateur.
                </p>
              </div>
              
              <div className="mt-6 w-full rounded-lg border border-dashed border-red-200 bg-red-50/50 p-4 text-left">
                <div className="flex items-center gap-2 mb-2 text-red-700">
                  <Info className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Diagnostic de sécurité</span>
                </div>
                <div className="space-y-1 font-mono text-[9px] text-red-600/80 break-all leading-tight">
                  <p>JETON_ID: {jeton || 'N/A'}</p>
                  <p>HTTP_CODE: {debugInfo?.httpStatus || 'N/A'}</p>
                  <p>SERVER_ERR: {debugInfo?.error || 'Aucune erreur système rapportée'}</p>
                </div>
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}