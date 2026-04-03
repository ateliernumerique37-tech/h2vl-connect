'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h2 className="text-2xl font-bold">Une erreur est survenue</h2>
      <p className="text-muted-foreground max-w-md">
        {error.message?.includes('permission') || error.message?.includes('Permission')
          ? "Vous n'avez pas les droits d'accès à cette ressource. Vérifiez que vous êtes bien connecté."
          : "Une erreur inattendue s'est produite. Réessayez ou contactez l'administrateur."}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
