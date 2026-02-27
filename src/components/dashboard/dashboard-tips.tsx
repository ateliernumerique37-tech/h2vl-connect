'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Lightbulb, CheckCircle2, Loader2 } from 'lucide-react';
import type { Adherent } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

/**
 * Composant intelligent affichant un conseil basé sur l'intégrité des données adhérents.
 */
export function DashboardTips() {
  const db = useFirestore();
  const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
  const { data: adherents, isLoading } = useCollection<Adherent>(adherentsQuery);

  const [tip, setTip] = useState<string | null>(null);
  const [isChoosing, setIsChoosing] = useState(true);

  useEffect(() => {
    // On attend que les données soient chargées
    if (isLoading) return;

    // Logique de génération des conseils
    const generateTips = () => {
      const tips: string[] = [];
      if (!adherents || adherents.length === 0) return [];

      adherents.forEach(a => {
        const name = `${a.prenom} ${a.nom}`;
        if (!a.telephone) {
          tips.push(`Le numéro de téléphone de ${name} est manquant.`);
        }
        if (!a.dateNaissance) {
          tips.push(`La date de naissance de ${name} n'est pas renseignée.`);
        }
        if (a.cotisationAJour === false) {
          tips.push(`${name} n'est pas à jour dans sa cotisation.`);
        }
      });
      return tips;
    };

    // Sélection aléatoire différée pour éviter les erreurs d'hydratation (SSR mismatch)
    const allTips = generateTips();
    if (allTips.length > 0) {
      const randomIndex = Math.floor(Math.random() * allTips.length);
      setTip(allTips[randomIndex]);
    } else {
      setTip('Félicitations, tous les profils de vos adhérents sont complets et à jour !');
    }
    setIsChoosing(false);
  }, [adherents, isLoading]);

  if (isLoading || isChoosing) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Sélection du conseil du jour...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
          Conseil utile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          aria-live="polite" 
          className="text-base font-medium text-foreground flex items-start gap-2"
        >
          {tip?.includes('Félicitations') && (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <p>{tip}</p>
        </div>
      </CardContent>
    </Card>
  );
}
