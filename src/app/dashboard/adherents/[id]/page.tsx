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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Save, Copy, CheckCircle2, ChevronLeft, Loader2, Phone, MapPin } from "lucide-react";
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
  const [isSaving, setIsSaving] = useState(false);
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

  const handleGenreChange = (value: Adherent['genre']) => {
    setFormData(prev => ({...prev, genre: value}));
  };

  const handleCopy = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(fieldName);
            toast({ title: "Copié !" });
            setTimeout(() => setCopiedField(null), 2000);
        }).catch(() => {
            toast({ variant: "destructive", title: "Erreur de copie" });
        });
    } else {
        toast({ variant: "destructive", title: "API Presse-papier non disponible" });
    }
  };

  const handleSwitchChange = async (field: keyof Adherent, checked: boolean) => {
    try {
        await updateAdherent(db, id, { [field]: checked });
        toast({ title: "Statut mis à jour" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur de mise à jour' });
    }
  };
  
  const handleDelete = async () => {
    try {
        await deleteAdherent(db, id);
        toast({ title: "Adhérent supprimé définitivement (RGPD)" });
        router.push('/dashboard/adherents');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur de suppression' });
    }
  };

  const handleAddCotisation = async () => {
    try {
        await addCotisation(db, id);
        setShowAddCotisationDialog(false);
        toast({ title: "Cotisation ajoutée" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur système' });
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
        await updateAdherent(db, id, formData);
        toast({ title: "Modifications enregistrées" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Échec de l\'enregistrement' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!adherent) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/adherents" aria-label="Retour à la liste">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Profil Adhérent</h1>
      </div>

      {/* Actions Rapides Mobiles */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {adherent.telephone && (
          <Button asChild size="lg" className="w-full h-16 text-lg shadow-md focus-visible:ring-2 focus-visible:ring-primary">
            <a href={`tel:${adherent.telephone.replace(/\s+/g, '')}`} aria-label={`Appeler ${adherent.prenom}`}>
              <Phone className="mr-2 h-6 w-6" /> Appeler l'adhérent
            </a>
          </Button>
        )}
        {adherent.adresse && (
          <Button asChild variant="outline" size="lg" className="w-full h-16 text-lg shadow-sm border-2 focus-visible:ring-2 focus-visible:ring-primary">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adherent.adresse)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label={`Ouvrir l'itinéraire vers l'adresse de ${adherent.prenom}`}
            >
              <MapPin className="mr-2 h-6 w-6 text-primary" /> Voir l'itinéraire
            </a>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations Personnelles</CardTitle>
          <CardDescription>Données complètes de l'adhérent (13 champs gérés).</CardDescription>
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
              <div className="flex gap-2">
                  <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} className="flex-1" maxLength={255} />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    type="button" 
                    onClick={() => handleCopy(formData.email, "Email")}
                    disabled={!formData.email}
                    aria-label="Copier l'adresse mail dans le presse-papier"
                  >
                      {copiedField === "Email" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <div className="flex gap-2">
                  <Input id="telephone" name="telephone" type="tel" value={formData.telephone || ''} onChange={handleInputChange} className="flex-1" maxLength={20} />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    type="button" 
                    onClick={() => handleCopy(formData.telephone, "Téléphone")}
                    disabled={!formData.telephone}
                    aria-label="Copier le numéro de téléphone dans le presse-papier"
                  >
                      {copiedField === "Téléphone" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse postale</Label>
            <div className="flex gap-2">
                <Input id="adresse" name="adresse" value={formData.adresse || ''} onChange={handleInputChange} className="flex-1" maxLength={500} />
                <Button 
                    variant="outline" 
                    size="icon" 
                    type="button" 
                    onClick={() => handleCopy(formData.adresse, "Adresse")}
                    disabled={!formData.adresse}
                    aria-label="Copier l'adresse postale dans le presse-papier"
                >
                    {copiedField === "Adresse" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
             <div className="space-y-2">
                <Label htmlFor="dateInscription">Date d'inscription</Label>
                <Input id="dateInscription" name="dateInscription" type="date" value={formData.dateInscription ? formData.dateInscription.split('T')[0] : ''} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-start gap-4 border-t pt-6">
          <Button onClick={handleSaveChanges} disabled={isSaving} className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer les modifications
          </Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="min-h-[44px]">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer (Droit à l'oubli)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression RGPD</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera TOUTES les données (profil, cotisations, inscriptions) de manière irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
            <CardDescription>Gérez les autorisations, l'engagement et les droits.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'estMembreBureau', label: 'Membre du bureau' },
              { id: 'estBenevole', label: 'Bénévole actif' },
              { id: 'estMembreFaaf', label: 'Membre FAAF' },
              { id: 'accordeDroitImage', label: 'Droit à l\'image accordé' },
              { id: 'cotisationAJour', label: 'Cotisation à jour' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border p-4 bg-card hover:border-primary/20 transition-colors">
                <Label htmlFor={`switch-${item.id}`} className="font-bold cursor-pointer">{item.label}</Label>
                <Switch 
                    id={`switch-${item.id}`} 
                    checked={adherent[item.id as keyof Adherent] as boolean}
                    onCheckedChange={(checked) => handleSwitchChange(item.id as keyof Adherent, checked)}
                    aria-label={`Changer le statut : ${item.label}`}
                />
              </div>
            ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Historique Financier</CardTitle>
          <CardDescription>Suivi des cotisations annuelles (Cotisation à jour : {adherent.cotisationAJour ? "Oui" : "Non"}).</CardDescription>
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
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">
                    Aucun historique financier enregistré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter className="border-t pt-6">
          <Dialog open={showAddCotisationDialog} onOpenChange={setShowAddCotisationDialog}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px]">
                <PlusCircle className="mr-2 h-4 w-4" /> Valider une cotisation ({new Date().getFullYear()})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Valider le paiement</DialogTitle>
                <DialogDescription>
                  Enregistrer le paiement de la cotisation (15€) pour l'année {new Date().getFullYear()} ?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCotisationDialog(false)}>Annuler</Button>
                <Button onClick={handleAddCotisation}>Confirmer le paiement</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
