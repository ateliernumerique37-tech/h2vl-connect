'use client';

import { useParams, useRouter } from 'next/navigation';
import type { Adherent } from '@/lib/types';
import { updateAdherent, deleteAdherent, addCotisationForYear, deleteCotisationForYear } from '@/services/adherentsService';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MOYENS_PAIEMENT, MOYEN_PAIEMENT_LABEL, type MoyenPaiement } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Save, ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function EditAdherentPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const id = params?.id as string;
  
  const adherentRef = useMemoFirebase(() => id ? doc(db, 'adherents', id) : null, [db, id]);
  const { data: adherent, isLoading: isLoadingAdherent } = useDoc<Adherent>(adherentRef);

  const [formData, setFormData] = useState<Partial<Adherent>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAddCotisationDialog, setShowAddCotisationDialog] = useState(false);
  const [selectedMoyen, setSelectedMoyen] = useState<MoyenPaiement>('especes');
  const [cotisationPending, setCotisationPending] = useState(false); // dialog pour switch ON

  useEffect(() => {
    if (adherent) {
        setFormData(adherent);
    }
  }, [adherent]);

  if (!id || isLoadingAdherent) {
      return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-[400px] w-full" />
        </div>
      );
  }

  if (!adherent) return null;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleGenreChange = (value: Adherent['genre']) => {
    setFormData(prev => ({...prev, genre: value}));
  };

  const handleSwitchChange = async (field: keyof Adherent, checked: boolean) => {
    // cotisationAJour ON → passer par le dialog de paiement
    if (field === 'cotisationAJour' && checked) {
      setSelectedMoyen('especes');
      setCotisationPending(true);
      return;
    }
    // cotisationAJour OFF → suppression directe
    if (field === 'cotisationAJour' && !checked) {
      try {
        await deleteCotisationForYear(db, id, new Date().getFullYear());
        toast({ title: "Cotisation annulée" });
      } catch {
        toast({ variant: 'destructive', title: 'Erreur' });
      }
      return;
    }
    try {
        await updateAdherent(db, id, { [field]: checked });
        toast({ title: "Statut mis à jour" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur de mise à jour' });
    }
  };

  const handleConfirmCotisation = async (moyen: MoyenPaiement) => {
    if (!adherent) return;
    try {
      await addCotisationForYear(db, id, new Date().getFullYear(), adherent.estMembreFaaf, moyen);
      toast({ title: "Cotisation enregistrée", description: MOYEN_PAIEMENT_LABEL[moyen] });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur' });
    } finally {
      setCotisationPending(false);
      setShowAddCotisationDialog(false);
    }
  };
  
  const handleDelete = async () => {
    try {
        await deleteAdherent(db, id);
        toast({ title: "Adhérent supprimé" });
        router.push('/dashboard/adherents');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur de suppression' });
    }
  };

  const handleAddCotisation = async () => {
    await handleConfirmCotisation(selectedMoyen);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
        await updateAdherent(db, id, formData);
        toast({ title: "Modifications enregistrées" });
        router.push(`/dashboard/adherents/${id}`);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Échec de l\'enregistrement' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/adherents/${id}`} aria-label="Retour au profil">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Modifier l'adhérent</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations Générales</CardTitle>
          <CardDescription>Mise à jour des coordonnées et données personnelles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" name="prenom" value={formData.prenom || ''} onChange={handleInputChange} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" name="nom" value={formData.nom || ''} onChange={handleInputChange} maxLength={50} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" type="tel" value={formData.telephone || ''} onChange={handleInputChange} maxLength={20} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse postale</Label>
            <Input id="adresse" name="adresse" value={formData.adresse || ''} onChange={handleInputChange} maxLength={500} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
             <div className="space-y-2">
                <Label htmlFor="dateNaissance">Date de naissance</Label>
                <Input id="dateNaissance" name="dateNaissance" type="date" value={formData.dateNaissance ? formData.dateNaissance.split('T')[0] : ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select value={formData.genre} onValueChange={handleGenreChange}>
                  <SelectTrigger id="genre" className="w-full">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-4 border-t pt-6">
          <div className="flex gap-2">
            <Button onClick={handleSaveChanges} disabled={isSaving} className="min-h-[44px]">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer les modifications
            </Button>
            <Button variant="outline" asChild className="min-h-[44px]">
                <Link href={`/dashboard/adherents/${id}`}>Annuler</Link>
            </Button>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="min-h-[44px]">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer définitivement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera toutes les données de l'adhérent. Cette opération est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Confirmer la suppression
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Statuts Associatifs</CardTitle>
            <CardDescription>Gérez les privilèges et les autorisations.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'estMembreBureau', label: 'Membre du bureau' },
              { id: 'estBenevole', label: 'Bénévole actif' },
              { id: 'estMembreFaaf', label: 'Membre FAAF' },
              { id: 'accordeDroitImage', label: 'Droit à l\'image' },
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
        <CardFooter className="border-t pt-6">
            <Dialog open={showAddCotisationDialog || cotisationPending} onOpenChange={(open) => { if (!open) { setShowAddCotisationDialog(false); setCotisationPending(false); } }}>
                <DialogTrigger asChild>
                <Button variant="outline" className="min-h-[44px]" onClick={() => { setSelectedMoyen('especes'); setShowAddCotisationDialog(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Valider une cotisation ({new Date().getFullYear()})
                </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Moyen de paiement</DialogTitle>
                    <DialogDescription>
                    Cotisation {new Date().getFullYear()} — {adherent.estMembreFaaf ? '40' : '15'} €. Par quel moyen a été effectué le règlement ?
                    </DialogDescription>
                </DialogHeader>
                <RadioGroup value={selectedMoyen} onValueChange={(v) => setSelectedMoyen(v as MoyenPaiement)} className="space-y-2 py-2">
                    {MOYENS_PAIEMENT.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                        <RadioGroupItem value={value} id={`edit-moyen-${value}`} />
                        <Label htmlFor={`edit-moyen-${value}`} className="cursor-pointer font-normal">{label}</Label>
                    </div>
                    ))}
                </RadioGroup>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowAddCotisationDialog(false); setCotisationPending(false); }}>Annuler</Button>
                    <Button onClick={handleAddCotisation}>Confirmer</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
