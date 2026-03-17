'use client';

import Link from 'next/link';
import type { Adherent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AdherentCardProps = {
  adherent: Adherent;
};

export function AdherentCard({ adherent }: AdherentCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md border-2 hover:border-primary/20">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
            <div className="grid gap-0.5 overflow-hidden">
                <p className="font-bold text-lg truncate leading-tight">{adherent.prenom} {adherent.nom}</p>
                <p className="text-sm text-muted-foreground truncate">{adherent.email}</p>
            </div>
            <Badge variant={adherent.cotisationAJour ? "secondary" : "destructive"} className="shrink-0 text-[10px]">
                {adherent.cotisationAJour ? "À jour" : "Retard"}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p className="flex items-center gap-1 truncate">📞 {adherent.telephone || 'Non renseigné'}</p>
              <p className="flex items-center gap-1 truncate">📍 {adherent.adresse || 'Pas d\'adresse'}</p>
          </div>
      </CardContent>
      <CardFooter className="p-3 pt-2 border-t bg-muted/30 gap-2 flex flex-wrap">
        <Button asChild variant="secondary" size="sm" className="flex-1 min-w-[80px] min-h-[40px]" aria-label={`Consulter le profil de ${adherent.prenom} ${adherent.nom}`}>
            <Link href={`/dashboard/adherents/${adherent.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Détails
            </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 min-w-[80px] min-h-[40px]" aria-label={`Modifier les informations de ${adherent.prenom} ${adherent.nom}`}>
            <Link href={`/dashboard/adherents/${adherent.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
