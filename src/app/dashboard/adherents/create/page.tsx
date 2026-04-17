'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addAdherent } from '@/services/adherentsService';
import type { Adherent } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { RoleGuard } from '@/components/dashboard/role-guard';
import { collection, getDocs, query, where } from 'firebase/firestore';

function CreateAdherentPageContent() {
    const router = useRouter();
    const db = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [doublon, setDoublon] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<Omit<Adherent, 'id' | 'dateInscription'>>({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        adresse: '',
        dateNaissance: '',
        genre: 'Autre',
        estMembreBureau: false,
        estBenevole: false,
        estMembreFaaf: false,
        accordeDroitImage: false,
        cotisationAJour: false,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSwitchChange = (name: keyof typeof formData, checked: boolean) => {
        setFormData(prev => ({...prev, [name]: checked}));
    };
    
    const handleSelectChange = (value: 'H' | 'F' | 'Autre') => {
        setFormData(prev => ({...prev, genre: value}));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLoading) return;
        setDoublon(null);
        setIsLoading(true);

        try {
            // Vérification doublon : email + prénom (même email + même prénom = même personne)
            if (formData.email) {
                const snap = await getDocs(
                    query(collection(db, 'adherents'), where('email', '==', formData.email.toLowerCase().trim()))
                );
                const prenomSaisi = formData.prenom.toLowerCase().trim();
                const doublon = snap.docs.find(d => {
                    const prenom = (d.data().prenom as string ?? '').toLowerCase().trim();
                    return prenom === prenomSaisi;
                });
                if (doublon) {
                    const d = doublon.data();
                    setDoublon(`${d.prenom} ${d.nom} est déjà enregistré avec cette adresse e-mail.`);
                    setIsLoading(false);
                    return;
                }
            }

            const newAdherentData = {
                ...formData,
                email: formData.email.toLowerCase().trim(),
                dateInscription: new Date().toISOString(),
            };
            await addAdherent(db, newAdherentData);
            toast({
                title: "Adhérent ajouté",
                description: `${formData.prenom} ${formData.nom} a été ajouté avec succès.`,
            });
            router.push('/dashboard/adherents');
        } catch (error) {
            console.error("Failed to add adherent:", error);
            toast({
                variant: 'destructive',
                title: "Erreur",
                description: "Impossible d'ajouter l'adhérent.",
            });
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Ajouter un nouvel adhérent</h1>
                <p className="text-muted-foreground">Remplissez les informations ci-dessous pour créer une nouvelle fiche.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                        <Label htmlFor="prenom">Prénom</Label>
                        <Input id="prenom" name="prenom" required value={formData.prenom} onChange={handleInputChange} aria-label="Saisir le prénom" maxLength={50} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="nom">Nom</Label>
                        <Input id="nom" name="nom" required value={formData.nom} onChange={handleInputChange} aria-label="Saisir le nom" maxLength={50} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} aria-label="Saisir l'email" maxLength={255} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone</Label>
                        <Input id="telephone" name="telephone" type="tel" value={formData.telephone} onChange={handleInputChange} aria-label="Saisir le téléphone" maxLength={20} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adresse">Adresse</Label>
                        <Input id="adresse" name="adresse" value={formData.adresse} onChange={handleInputChange} aria-label="Saisir l'adresse" maxLength={500} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="dateNaissance">Date de naissance</Label>
                            <Input id="dateNaissance" name="dateNaissance" type="date" required value={formData.dateNaissance.split('T')[0]} onChange={handleInputChange} aria-label="Sélectionner la date de naissance" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="genre">Genre</Label>
                            <Select name="genre" onValueChange={handleSelectChange} value={formData.genre}>
                                <SelectTrigger id="genre" aria-label="Sélectionner le genre" className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Statuts et Autorisations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="cotisationAJour" className="pr-4">Cotisation à jour</Label>
                        <Switch id="cotisationAJour" checked={formData.cotisationAJour} onCheckedChange={(checked) => handleSwitchChange('cotisationAJour', checked)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="estMembreBureau" className="pr-4">Membre du bureau</Label>
                        <Switch id="estMembreBureau" checked={formData.estMembreBureau} onCheckedChange={(checked) => handleSwitchChange('estMembreBureau', checked)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="estBenevole" className="pr-4">Bénévole</Label>
                        <Switch id="estBenevole" checked={formData.estBenevole} onCheckedChange={(checked) => handleSwitchChange('estBenevole', checked)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="estMembreFaaf" className="pr-4">Membre FAAF</Label>
                        <Switch id="estMembreFaaf" checked={formData.estMembreFaaf} onCheckedChange={(checked) => handleSwitchChange('estMembreFaaf', checked)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="accordeDroitImage" className="pr-4">Droit à l'image accordé</Label>
                        <Switch id="accordeDroitImage" checked={formData.accordeDroitImage} onCheckedChange={(checked) => handleSwitchChange('accordeDroitImage', checked)} />
                    </div>
                </CardContent>
            </Card>
            
            {doublon && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive" role="alert" aria-live="assertive">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                        <p className="font-semibold">Adhérent déjà existant</p>
                        <p className="text-sm mt-0.5">{doublon}</p>
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.push('/dashboard/adherents')} disabled={isLoading} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    Annuler
                </Button>
                <Button type="submit" disabled={isLoading} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer l'adhérent
                </Button>
            </div>
        </form>
    );
}

export default function CreateAdherentPage() {
    return (
        <RoleGuard>
            <CreateAdherentPageContent />
        </RoleGuard>
    );
}
