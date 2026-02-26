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
import { useState, useEffect, useMemo } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Trash2, Save, Copy, CheckCircle2, ChevronLeft } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import Link from 'next/link';

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
                </CardContent>
            </Card>
        </div>
    )
}

export default function AdherentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const id = params?.id as string;
  
  const adherentRef = useMemoFirebase(() => id ? doc(db, 'adherents', id) : null, [db, id]);
  const { data: adherent, isLoading: isLoadingAdherent } = useDoc<Adherent>(adherentRef);

  // Simplified query to avoid index requirements, we'll sort on client side
  const cotisationsQuery = useMemoFirebase(() => id ? query(
    collection(db, 'cotisations'), 
    where('adherentId', '==', id)
  ) : null, [db, id]);
  const { data: rawCotisations, isLoading: isLoadingCotisations } = useCollection<Cotisation>(cotisationsQuery);

  const adherentCotisations = useMemo(() => {
    if (!rawCotisations) return [];
    return [...rawCotisations].sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());
  }, [rawCotisations]);

  const [formData, setFormData] = useState<Partial<Adherent>>({});
  const [showAddCotisationDialog, setShowAddCotisationDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (adherent) {
        setFormData(adherent);
    }
  }, [adherent]);

  if (!id || isLoadingAdherent || isLoadingCotisations) {
      return <AdherentDetailSkeleton />;
  }

  if (!adherent && !isLoadingAdherent) {
    return notFound();
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleCopy = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({ title: "Copié !", description: `${fieldName} a été copié.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSwitchChange = async (field: keyof Adherent, checked: boolean) => {
    try {
        await updateAdherent(db, id, { [field]: checked });
        toast({ title: "Statut mis à jour" });
    } catch (error) {
        console.error(`Failed to update ${field}:`, error);
        toast({ variant: 'destructive', title: 'Erreur' });
    }
  };
  
  const handleDelete = async () => {
    try {
        await deleteAdherent(db, id);
        toast({ title: "Adhérent supprimé" });
        router.push('/dashboard/adherents');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur' });
    }
  };

  const handleAddCotisation = async () => {
    try {
        await addCotisation(db, id);
        setShowAddCotisationDialog(false);
        toast({ title: "Cotisation ajoutée" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur' });
    }
  };

  const handleSaveChanges = async () => {
    try {
        await updateAdherent(db, id, formData);
        toast({ title: "Modifications enregistrées" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur' });
    }
  };

  if (!adherent) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/adherents" aria-label="Retour à la liste des adhérents">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Fiche de {adherent.prenom} {adherent.nom}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations Personnelles</CardTitle>
          <CardDescription>Contact et profil personnel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" name="prenom" value={formData.prenom || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" name="nom" value={formData.nom || ''} onChange={handleInputChange} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex gap-2">
                <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} className="flex-1" />
                <Button variant="outline" size="icon" type="button" onClick={() => handleCopy(formData.email, "L'email")}>
                    {copiedField === "L'email" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <div className="flex gap-2">
                <Input id="telephone" name="telephone" type="tel" value={formData.telephone || ''} onChange={handleInputChange} className="flex-1" />
                <Button variant="outline" size="icon" type="button" onClick={() => handleCopy(formData.telephone, "Le téléphone")}>
                    {copiedField === "Le téléphone" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-start gap-4 border-t pt-6">
          <Button onClick={handleSaveChanges} aria-label={`Enregistrer les modifications pour ${adherent.prenom}`}>
            <Save className="mr-2 h-4 w-4" /> Enregistrer
          </Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" aria-label={`Supprimer ${adherent.prenom}`}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Action irréversible pour <strong>{adherent.prenom} {adherent.nom}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Statuts</CardTitle>
            <CardDescription>Gérez les autorisations.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'estMembreBureau', label: 'Membre du bureau' },
              { id: 'estBenevole', label: 'Bénévole actif' },
              { id: 'cotisationAJour', label: 'Cotisation à jour' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border p-4 bg-card">
                <Label htmlFor={`switch-${item.id}`} className="font-bold">{item.label}</Label>
                <Switch 
                    id={`switch-${item.id}`} 
                    checked={adherent[item.id as keyof Adherent] as boolean}
                    onCheckedChange={(checked) => handleSwitchChange(item.id as keyof Adherent, checked)}
                />
              </div>
            ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Historique Financier</CardTitle>
          <CardDescription>Suivi des cotisations.</CardDescription>
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
                    <TableCell className="font-medium">{cotisation.annee}</TableCell>
                    <TableCell>{new Date(cotisation.datePaiement).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right font-bold">{cotisation.montant.toFixed(2)} €</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    Aucun historique de paiement.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter className="border-t pt-6">
          <Dialog open={showAddCotisationDialog} onOpenChange={setShowAddCotisationDialog}>
            <DialogTrigger asChild>
              <Button aria-label={`Valider cotisation pour ${adherent.prenom}`}>
                <PlusCircle className="mr-2 h-4 w-4" /> Valider une cotisation (15 €)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Valider le paiement</DialogTitle>
                <DialogDescription>
                  Enregistrer 15,00 € pour <strong>{adherent.prenom} {adherent.nom}</strong> ?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCotisationDialog(false)}>Annuler</Button>
                <Button onClick={handleAddCotisation}>Confirmer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
