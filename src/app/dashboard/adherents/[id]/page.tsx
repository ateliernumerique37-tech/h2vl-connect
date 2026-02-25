'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { adherents, cotisations } from '@/lib/placeholder-data';
import type { Adherent, Cotisation } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Trash2 } from "lucide-react";

function AdherentDetailSkeleton() {
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-8 w-1/2" /></CardTitle>
                    <CardDescription><Skeleton className="h-4 w-3/4" /></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-8 w-1/3" /></CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 rounded-md border p-4">
                           <div className="flex-1 space-y-1"><Skeleton className="h-4 w-1/2" /></div>
                           <Skeleton className="h-6 w-11" />
                        </div>
                    ))}
                 </CardContent>
            </Card>
        </div>
    )
}

export default function AdherentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [adherent, setAdherent] = useState<Adherent | undefined>(undefined);
  const [adherentCotisations, setAdherentCotisations] = useState<Cotisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCotisationDialog, setShowAddCotisationDialog] = useState(false);

  useEffect(() => {
    // In a real app, you would fetch data here based on the id
    const foundAdherent = adherents.find((a) => a.id === id);
    if(foundAdherent) {
      setAdherent(foundAdherent);
      const foundCotisations = cotisations.filter(c => c.adherentId === id);
      setAdherentCotisations(foundCotisations);
    }
    const timer = setTimeout(() => setLoading(false), 500); // Simulate loading
    return () => clearTimeout(timer);
  }, [id]);

  if (loading) {
      return <AdherentDetailSkeleton />;
  }

  if (!adherent) {
    return notFound();
  }
  
  const handleSwitchChange = (field: keyof Adherent, checked: boolean) => {
    setAdherent(prev => prev ? {...prev, [field]: checked} : undefined);
  };
  
  const handleDelete = () => {
    console.log(`Deleting adherent ${adherent.id}`);
    router.push('/dashboard/adherents');
  };

  const handleAddCotisation = () => {
    const currentYear = new Date().getFullYear();
    const newCotisation: Cotisation = {
      id: `cot-${new Date().getTime()}`,
      adherentId: id,
      annee: currentYear,
      datePaiement: new Date().toISOString(),
      montant: 15,
    };
    setAdherentCotisations(prev => [...prev, newCotisation].sort((a,b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime()));
    setAdherent(prev => prev ? {...prev, cotisationAJour: true} : undefined);
    setShowAddCotisationDialog(false);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fiche de {adherent.prenom} {adherent.nom}</CardTitle>
          <CardDescription>
            Consultez et modifiez les informations de l'adhérent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">Prénom</Label>
              <Input id="first-name" defaultValue={adherent.prenom} aria-label={`Modifier le prénom, actuellement ${adherent.prenom}`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nom</Label>
              <Input id="last-name" defaultValue={adherent.nom} aria-label={`Modifier le nom, actuellement ${adherent.nom}`} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={adherent.email} aria-label={`Modifier l'email, actuellement ${adherent.email}`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" defaultValue={adherent.telephone} aria-label={`Modifier le téléphone, actuellement ${adherent.telephone}`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" defaultValue={adherent.adresse} aria-label={`Modifier l'adresse`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="birth-date">Date de naissance</Label>
                <Input id="birth-date" defaultValue={new Date(adherent.dateNaissance).toLocaleDateString('fr-FR')} aria-label={`Modifier la date de naissance`} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="inscription-date">Date d'inscription</Label>
                <Input id="inscription-date" value={new Date(adherent.dateInscription).toLocaleDateString('fr-FR')} readOnly disabled />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button>Enregistrer les modifications</Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" aria-label={`Supprimer l'adhérent ${adherent.prenom} ${adherent.nom}`}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Elle supprimera définitivement l'adhérent
                  <span className="font-semibold"> {adherent.prenom} {adherent.nom}</span> et toutes les données associées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Continuer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Statuts et autorisations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="switch-membre-bureau" className="flex flex-col space-y-1">
                    <span>Membre du bureau</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Indique si l'adhérent fait partie du bureau de l'association.
                    </span>
                </Label>
                <Switch 
                    id="switch-membre-bureau" 
                    checked={adherent.estMembreBureau}
                    onCheckedChange={(checked) => handleSwitchChange('estMembreBureau', checked)}
                    aria-label="Activer le statut de membre du bureau"
                />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="switch-benevole" className="flex flex-col space-y-1">
                    <span>Bénévole</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Indique si l'adhérent participe activement comme bénévole.
                    </span>
                </Label>
                 <Switch 
                    id="switch-benevole" 
                    checked={adherent.estBenevole} 
                    onCheckedChange={(checked) => handleSwitchChange('estBenevole', checked)}
                    aria-label="Activer le statut de bénévole"
                 />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
                 <Label htmlFor="switch-membre-faaf" className="flex flex-col space-y-1">
                    <span>Membre FAAF</span>
                     <span className="font-normal leading-snug text-muted-foreground">
                        Indique si l'adhérent est affilié à la FAAF.
                    </span>
                </Label>
                 <Switch 
                    id="switch-membre-faaf" 
                    checked={adherent.estMembreFaaf} 
                    onCheckedChange={(checked) => handleSwitchChange('estMembreFaaf', checked)}
                    aria-label="Activer le statut de membre FAAF"
                 />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
                 <Label htmlFor="switch-droit-image" className="flex flex-col space-y-1">
                    <span>Droit à l'image</span>
                     <span className="font-normal leading-snug text-muted-foreground">
                       Indique si l'adhérent a accordé son droit à l'image.
                    </span>
                </Label>
                 <Switch 
                    id="switch-droit-image" 
                    checked={adherent.accordeDroitImage} 
                    onCheckedChange={(checked) => handleSwitchChange('accordeDroitImage', checked)}
                    aria-label="Activer le droit à l'image"
                 />
            </div>
             <div className="flex items-center justify-between rounded-lg border p-4">
                 <Label htmlFor="switch-cotisation-jour" className="flex flex-col space-y-1">
                    <span>Cotisation à jour</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Indique si la cotisation annuelle de l'adhérent est réglée.
                    </span>
                </Label>
                 <Switch 
                    id="switch-cotisation-jour"
                    checked={adherent.cotisationAJour} 
                    onCheckedChange={(checked) => handleSwitchChange('cotisationAJour', checked)}
                    aria-label="Marquer la cotisation comme à jour"
                 />
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Historique des Cotisations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Année</TableHead>
                <TableHead>Date de paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adherentCotisations.length > 0 ? (
                adherentCotisations.map((cotisation) => (
                  <TableRow key={cotisation.id}>
                    <TableCell>{cotisation.annee}</TableCell>
                    <TableCell>{new Date(cotisation.datePaiement).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right">{cotisation.montant.toFixed(2)} €</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Aucun historique de cotisation.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
          <Dialog open={showAddCotisationDialog} onOpenChange={setShowAddCotisationDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter une cotisation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une cotisation</DialogTitle>
                <DialogDescription>
                  Confirmez l'ajout d'une cotisation de 15,00 € pour l'année en cours ({new Date().getFullYear()}) pour {adherent.prenom} {adherent.nom}.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCotisationDialog(false)}>Annuler</Button>
                <Button onClick={handleAddCotisation}>Confirmer et ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
