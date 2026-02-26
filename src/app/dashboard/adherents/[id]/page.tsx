'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import type { Adherent, Cotisation } from '@/lib/types';
import { updateAdherent, deleteAdherent, addCotisation } from '@/services/adherentsService';
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
import { PlusCircle, Trash2, Save } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';

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
        </div>
    )
}

export default function AdherentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const id = params.id as string;
  const { toast } = useToast();
  
  const adherentRef = useMemoFirebase(() => doc(db, 'adherents', id), [db, id]);
  const { data: adherent, isLoading: isLoadingAdherent } = useDoc<Adherent>(adherentRef);

  const cotisationsQuery = useMemoFirebase(() => query(
    collection(db, 'cotisations'), 
    where('adherentId', '==', id),
    orderBy('datePaiement', 'desc')
  ), [db, id]);
  const { data: adherentCotisations, isLoading: isLoadingCotisations } = useCollection<Cotisation>(cotisationsQuery);

  const [formData, setFormData] = useState<Partial<Adherent>>({});
  const [showAddCotisationDialog, setShowAddCotisationDialog] = useState(false);

  useEffect(() => {
    if (adherent) {
        setFormData(adherent);
    }
  }, [adherent]);

  if (isLoadingAdherent || isLoadingCotisations) {
      return <AdherentDetailSkeleton />;
  }

  if (!adherent) {
    return notFound();
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleSwitchChange = async (field: keyof Adherent, checked: boolean) => {
    try {
        await updateAdherent(db, id, { [field]: checked });
        toast({
            title: "Statut mis à jour",
            description: `Le statut a été modifié avec succès.`,
        });
    } catch (error) {
        console.error(`Failed to update ${field}:`, error);
        toast({ variant: 'destructive', title: 'Erreur', description: `Impossible de mettre à jour le statut.` });
    }
  };
  
  const handleDelete = async () => {
    try {
        await deleteAdherent(db, id);
        toast({
            title: "Adhérent supprimé",
            description: `${adherent.prenom} ${adherent.nom} a été supprimé.`,
        });
        router.push('/dashboard/adherents');
    } catch (error) {
        console.error("Failed to delete adherent:", error);
        toast({ variant: 'destructive', title: 'Erreur de suppression', description: "Impossible de supprimer l'adhérent." });
    }
  };

  const handleAddCotisation = async () => {
    try {
        await addCotisation(db, id);
        setShowAddCotisationDialog(false);
        toast({
            title: "Cotisation ajoutée",
            description: `Une cotisation de 15,00 € a été ajoutée pour ${adherent.prenom} ${adherent.nom}.`,
        });
    } catch (error) {
        console.error("Failed to add cotisation:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'ajouter la cotisation." });
    }
  };

  const handleSaveChanges = async () => {
    try {
        await updateAdherent(db, id, formData);
        toast({
            title: "Modifications enregistrées",
            description: `Les informations de ${adherent.prenom} ${adherent.nom} ont été mises à jour.`,
        });
    } catch (error) {
        console.error("Failed to save changes:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'enregistrer les modifications." });
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fiche de {adherent.prenom} {adherent.nom}</CardTitle>
          <CardDescription>
            Informations mises à jour en temps réel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" name="prenom" value={formData.prenom || ''} onChange={handleInputChange} aria-label={`Modifier le prénom, actuellement ${adherent.prenom}`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" name="nom" value={formData.nom || ''} onChange={handleInputChange} aria-label={`Modifier le nom, actuellement ${adherent.nom}`} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} aria-label={`Modifier l'email, actuellement ${adherent.email}`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" name="telephone" type="tel" value={formData.telephone || ''} onChange={handleInputChange} aria-label={`Modifier le téléphone, actuellement ${adherent.telephone}`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" name="adresse" value={formData.adresse || ''} onChange={handleInputChange} aria-label={`Modifier l'adresse`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="dateNaissance">Date de naissance</Label>
                <Input id="dateNaissance" name="dateNaissance" type="date" value={formData.dateNaissance ? formData.dateNaissance.split('T')[0] : ''} onChange={handleInputChange} aria-label={`Modifier la date de naissance`} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="inscription-date">Date d'inscription</Label>
                <Input id="inscription-date" value={new Date(adherent.dateInscription).toLocaleDateString('fr-FR')} readOnly disabled />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-4">
          <Button onClick={handleSaveChanges} aria-label={`Enregistrer les modifications pour ${adherent.prenom} ${adherent.nom}`}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" aria-label={`Supprimer définitivement l'adhérent ${adherent.prenom} ${adherent.nom}`}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera définitivement l'adhérent <strong>{adherent.prenom} {adherent.nom}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Confirmer la suppression</AlertDialogAction>
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
            {[
              { id: 'estMembreBureau', label: 'Membre du bureau', desc: 'Indique si l\'adhérent fait partie du bureau.' },
              { id: 'estBenevole', label: 'Bénévole', desc: 'Indique si l\'adhérent est actif comme bénévole.' },
              { id: 'estMembreFaaf', label: 'Membre FAAF', desc: 'Affiliation à la FAAF.' },
              { id: 'accordeDroitImage', label: 'Droit à l\'image', desc: 'Autorisation d\'utilisation de l\'image.' },
              { id: 'cotisationAJour', label: 'Cotisation à jour', desc: 'Statut de paiement pour l\'année en cours.' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor={`switch-${item.id}`} className="flex flex-col space-y-1">
                    <span>{item.label}</span>
                    <span className="font-normal leading-snug text-muted-foreground">{item.desc}</span>
                </Label>
                <Switch 
                    id={`switch-${item.id}`} 
                    checked={adherent[item.id as keyof Adherent] as boolean}
                    onCheckedChange={(checked) => handleSwitchChange(item.id as keyof Adherent, checked)}
                    aria-label={`Modifier le statut ${item.label}`}
                />
              </div>
            ))}
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
              {adherentCotisations && adherentCotisations.length > 0 ? (
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
              <Button aria-label="Ajouter une nouvelle cotisation pour cet adhérent">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter une cotisation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une cotisation</DialogTitle>
                <DialogDescription>
                  Confirmez l'ajout d'une cotisation de 15,00 € pour {adherent.prenom} {adherent.nom}.
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
