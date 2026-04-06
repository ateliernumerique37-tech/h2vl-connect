'use client';

import Link from 'next/link';
import type { Adherent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil, Eye, Loader2 } from "lucide-react";
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addCotisationForYear, deleteCotisationForYear } from '@/services/adherentsService';

type AdherentCardProps = {
  adherent: Adherent;
};

export function AdherentCard({ adherent }: AdherentCardProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const currentYear = new Date().getFullYear();
  const switchId = `cotisation-toggle-${adherent.id}`;

  const handleToggleCotisation = async (checked: boolean) => {
    setIsToggling(true);
    try {
      if (checked) {
        await addCotisationForYear(db, adherent.id, currentYear, adherent.estMembreFaaf);
        toast({ title: `Cotisation ${currentYear} enregistrée`, description: `${adherent.prenom} ${adherent.nom} — ${adherent.estMembreFaaf ? '40' : '15'} €` });
      } else {
        await deleteCotisationForYear(db, adherent.id, currentYear);
        toast({ title: `Cotisation ${currentYear} annulée`, description: `${adherent.prenom} ${adherent.nom}` });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la cotisation.' });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md border-2 hover:border-primary/20">
      <CardHeader className="p-4 pb-2">
        <div className="grid gap-0.5 overflow-hidden">
          <p className="font-bold text-lg truncate leading-tight">{adherent.prenom} {adherent.nom}</p>
          <p className="text-sm text-muted-foreground truncate">{adherent.email}</p>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 space-y-3">
        <div className="text-xs text-muted-foreground space-y-1 mt-2">
          <p className="flex items-center gap-1 truncate">📞 {adherent.telephone || 'Non renseigné'}</p>
          <p className="flex items-center gap-1 truncate">📍 {adherent.adresse || 'Pas d\'adresse'}</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
          <Label
            htmlFor={switchId}
            className="text-sm font-medium cursor-pointer select-none flex items-center gap-2"
          >
            {isToggling && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            Cotisation {currentYear}
          </Label>
          <Switch
            id={switchId}
            checked={adherent.cotisationAJour}
            onCheckedChange={handleToggleCotisation}
            disabled={isToggling}
            aria-label={`Cotisation ${currentYear} de ${adherent.prenom} ${adherent.nom} — ${adherent.cotisationAJour ? 'à jour' : 'en attente'}`}
          />
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-2 border-t bg-muted/30 gap-2 flex flex-wrap">
        <Button asChild variant="secondary" size="sm" className="flex-1 min-w-[80px] min-h-[40px]" aria-label={`Consulter le profil de ${adherent.prenom} ${adherent.nom}`}>
          <Link href={`/dashboard/adherents/${adherent.id}`}>
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            Détails
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 min-w-[80px] min-h-[40px]" aria-label={`Modifier les informations de ${adherent.prenom} ${adherent.nom}`}>
          <Link href={`/dashboard/adherents/${adherent.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Modifier
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
