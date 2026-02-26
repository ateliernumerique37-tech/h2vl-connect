'use client';

import Link from 'next/link';
import type { Adherent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAdherent } from '@/services/adherentsService';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

type AdherentCardProps = {
  adherent: Adherent;
};

export function AdherentCard({ adherent }: AdherentCardProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const initials = `${adherent.prenom?.[0] ?? ''}${adherent.nom?.[0] ?? ''}`.toUpperCase();
  
  const handleDelete = async () => {
    try {
      await deleteAdherent(db, adherent.id);
      toast({
        title: "Adhérent supprimé",
        description: `${adherent.prenom} ${adherent.nom} a été supprimé de la base de données.`,
      });
    } catch (error) {
      console.error("Failed to delete adherent:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible de supprimer ${adherent.prenom} ${adherent.nom}.`,
      });
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md border-2 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center gap-4 p-4 pb-2">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage src={`https://picsum.photos/seed/${adherent.id}/48/48`} alt={`Avatar de ${adherent.prenom} ${adherent.nom}`} data-ai-hint="avatar person" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="grid gap-0.5 overflow-hidden">
          <p className="font-bold text-lg truncate leading-tight">{adherent.prenom} {adherent.nom}</p>
          <p className="text-sm text-muted-foreground truncate">{adherent.email}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p className="flex items-center gap-1">📞 {adherent.telephone || 'Téléphone non renseigné'}</p>
              <p className="flex items-center gap-1 line-clamp-1">📍 {adherent.adresse || 'Adresse non renseignée'}</p>
          </div>
      </CardContent>
      <CardFooter className="p-3 pt-2 border-t bg-muted/30 gap-2 flex flex-wrap">
        <Button asChild variant="secondary" size="sm" className="flex-1 min-w-[80px]" aria-label={`Consulter la fiche complète de ${adherent.prenom} ${adherent.nom}`}>
            <Link href={`/dashboard/adherents/${adherent.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Détails
            </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 min-w-[80px]" aria-label={`Modifier les informations de ${adherent.prenom} ${adherent.nom}`}>
            <Link href={`/dashboard/adherents/${adherent.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
            </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="px-3" aria-label={`Supprimer l'adhérent ${adherent.prenom} ${adherent.nom}`}>
                <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer l'adhérent <strong>{adherent.prenom} {adherent.nom}</strong> ? Cette action est irréversible et supprimera tout son historique.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Supprimer {adherent.prenom}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
