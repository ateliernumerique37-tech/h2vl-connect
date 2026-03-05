'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle, MailCheck } from "lucide-react";
import { Logo } from "@/components/icons";

export const dynamic = 'force-dynamic';

function ConfirmationContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function validateJeton() {
      if (!jeton) return;

      try {
        const response = await fetch('/api/confirm-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jeton }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.error || "Lien invalide ou expiré.");
        }
      } catch (err) {
        console.error("Erreur confirmation:", err);
        setStatus('error');
        setErrorMessage("Impossible de joindre le serveur de validation.");
      }
    }

    validateJeton();
  }, [jeton]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">H2VL Connect</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 text-center space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Validation de votre message...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Réception confirmée !</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Merci d'avoir pris connaissance de notre message.<br />
                  Votre lecture a bien été enregistrée.
                </p>
              </div>
              <p className="text-sm font-medium text-primary pt-4">À bientôt chez H2VL ✨</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Oups !</h2>
                <p className="text-red-600 font-medium">{errorMessage}</p>
                <p className="text-sm text-muted-foreground pt-2">
                  Si vous pensez qu'il s'agit d'une erreur, merci de contacter le Bureau.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
