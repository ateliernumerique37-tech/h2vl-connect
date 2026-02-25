'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import type { Adherent, Cotisation } from '@/lib/types';
import { getAdherentById, updateAdherent, deleteAdherent, getCotisationsForAdherent, addCotisation } from '@/services/adherentsService';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';

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
  const db = useFirestore();
  const id = params.id as string;
  const { toast } = useToast();
  
  const [adherent, setAdherent] = useState<Adherent | null>(null);
  const [formData, setFormData] = useState<Partial<Adherent>>({});
  const [adherentCotisations, setAdherentCotisations] = useState<Cotisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCotisationDialog, setShowAddCotisationDialog] = useState(false);

  useEffect(() => {
    if (!id || !db) return;
    async function fetchData() {
        try {
            const [adherentData, cotisationsData] = await Promise.all([
                getAdherentById(db, id),
                getCotisationsForAdherent(db, id)
            ]);
            
            if (adherentData) {
                setAdherent(adherentData);
                setFormData(adherentData);
                setAdherentCotisations(cotisationsData);
            }
        } catch (error) {
            console.error("Failed to fetch adherent data:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de charger les données de l'adhérent." });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [id, db, toast]);

  if (loading) {
      return <AdherentDetailSkeleton />;
  }

  if (!adherent) {
    // This will be triggered after loading is false and adherent is still null
    return notFound();
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleSwitchChange = async (field: keyof Adherent, checked: boolean) => {
    setFormData(prev => ({...prev, [field]: checked}));
    try {
        await updateAdherent(db, id, { [field]: checked });
        
        const fieldLabels: Record<keyof Adherent, string> = {
            estMembreBureau: "Membre du bureau",
            estBenevole: "Bénévole",
            estMembreFaaf: "Membre FAAF",
            accordeDroitImage: "Droit à l'image",
            cotisationAJour: "Cotisation à jour",
            id: '', prenom: '', nom: '', email: '', telephone: '', adresse: '', dateNaissance: '', genre: 'Autre', dateInscription: ''
        };
        const status = checked ? 'activé' : 'désactivé';
        toast({
            title: "Mise à jour du statut",
            description: `Le statut "${fieldLabels[field]}" pour ${adherent.prenom} ${adherent.nom} a été ${status}.`,
        });
    } catch (error) {
        console.error(`Failed to update ${field}:`, error);
        toast({ variant: 'destructive', title: 'Erreur de mise à jour', description: `N'a pas pu mettre à jour le statut.` });
        // Revert UI change on error
        setFormData(prev => ({...prev, [field]: !checked}));
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
        const cotisationsData = await getCotisationsForAdherent(db, id);
        setAdherentCotisations(cotisationsData);
        setFormData(prev => ({...prev, cotisationAJour: true}));
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
        setAdherent(prev => prev ? {...prev, ...formData} : null);
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
            Consultez et modifiez les informations de l'adhérent.
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
        <CardFooter className="flex justify-between">
          <Button onClick={handleSaveChanges}>Enregistrer les modifications</Button>
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
                    checked={formData.estMembreBureau}
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
                    checked={formData.estBenevole} 
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
                    checked={formData.estMembreFaaf} 
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
                    checked={formData.accordeDroitImage} 
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
                    checked={formData.cotisationAJour} 
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
