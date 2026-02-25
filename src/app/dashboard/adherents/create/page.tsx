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
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';

export default function CreateAdherentPage() {
    const router = useRouter();
    const db = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
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
        setIsLoading(true);
        try {
            const newAdherentData = {
                ...formData,
                dateInscription: new Date().toISOString()
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
                        <Input id="prenom" name="prenom" required value={formData.prenom} onChange={handleInputChange} aria-label="Saisir le prénom" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="nom">Nom</Label>
                        <Input id="nom" name="nom" required value={formData.nom} onChange={handleInputChange} aria-label="Saisir le nom" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} aria-label="Saisir l'email" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone</Label>
                        <Input id="telephone" name="telephone" type="tel" value={formData.telephone} onChange={handleInputChange} aria-label="Saisir le téléphone" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adresse">Adresse</Label>
                        <Input id="adresse" name="adresse" value={formData.adresse} onChange={handleInputChange} aria-label="Saisir l'adresse" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="dateNaissance">Date de naissance</Label>
                            <Input id="dateNaissance" name="dateNaissance" type="date" required value={formData.dateNaissance.split('T')[0]} onChange={handleInputChange} aria-label="Sélectionner la date de naissance" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="genre">Genre</Label>
                            <Select name="genre" onValueChange={handleSelectChange} value={formData.genre}>
                                <SelectTrigger id="genre" aria-label="Sélectionner le genre">
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
            
            <div className="flex justify-start">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer l'adhérent
                </Button>
            </div>
        </form>
    );
}
