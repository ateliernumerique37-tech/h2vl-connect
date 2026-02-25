'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from '@/components/ui/textarea';

export default function CreateEventPage() {
    const [necessiteMenu, setNecessiteMenu] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        
        if (data.necessiteMenu === 'on') {
            const optionsMenu: { [key: string]: string[] } = {};
            if (data.aperitifs) optionsMenu.aperitifs = (data.aperitifs as string).split(',').map(s => s.trim()).filter(Boolean);
            if (data.entrees) optionsMenu.entrees = (data.entrees as string).split(',').map(s => s.trim()).filter(Boolean);
            if (data.plats) optionsMenu.plats = (data.plats as string).split(',').map(s => s.trim()).filter(Boolean);
            if (data.fromages) optionsMenu.fromages = (data.fromages as string).split(',').map(s => s.trim()).filter(Boolean);
            if (data.desserts) optionsMenu.desserts = (data.desserts as string).split(',').map(s => s.trim()).filter(Boolean);
            data.optionsMenu = optionsMenu;
        }
        console.log('Form data:', data);
        // Here you would typically send the data to your backend
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <header>
                 <h1 className="text-3xl font-bold tracking-tight">Créer un nouvel événement</h1>
                 <p className="text-muted-foreground">Remplissez les détails ci-dessous pour ajouter un nouvel événement.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Informations principales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="titre">Titre de l'événement</Label>
                        <Input id="titre" name="titre" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" required />
                    </div>
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date et Heure</Label>
                            <Input id="date" name="date" type="datetime-local" required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lieu">Lieu</Label>
                            <Input id="lieu" name="lieu" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prix">Prix (€)</Label>
                        <Input id="prix" name="prix" type="number" min="0" step="0.01" defaultValue="0" required />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-2xl font-semibold leading-none tracking-tight">Options de menu</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor="necessiteMenu" className="flex flex-col space-y-1 pr-4">
                            <span>Cet événement nécessite de faire un choix de menu de restaurant</span>
                             <span className="font-normal leading-snug text-muted-foreground">
                                Si coché, vous pourrez définir les options de repas.
                            </span>
                        </Label>
                        <Switch
                            id="necessiteMenu"
                            name="necessiteMenu"
                            checked={necessiteMenu}
                            onCheckedChange={setNecessiteMenu}
                            aria-label="Activer le choix de menu pour cet événement"
                        />
                    </div>
                    {necessiteMenu && (
                        <div className="space-y-4 pt-4">
                             <p className="text-sm text-muted-foreground" role="text">
                                Séparez les différents plats par des virgules.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="aperitifs">Apéritifs</Label>
                                <Input id="aperitifs" name="aperitifs" placeholder="Ex: Kir, Jus de fruit" aria-label="Saisissez les choix d'apéritifs, séparés par des virgules" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entrees">Entrées</Label>
                                <Input id="entrees" name="entrees" placeholder="Ex: Salade composée, Velouté de saison" aria-label="Saisissez les choix d'entrées, séparés par des virgules" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plats">Plats</Label>
                                <Input id="plats" name="plats" placeholder="Ex: Poulet rôti, Option végétarienne" aria-label="Saisissez les choix de plats, séparés par des virgules" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fromages">Salade ou Fromages</Label>
                                <Input id="fromages" name="fromages" placeholder="Ex: Assiette de fromages, Fromage blanc" aria-label="Saisissez les choix de fromages, séparés par des virgules" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="desserts">Desserts</Label>
                                <Input id="desserts" name="desserts" placeholder="Ex: Tarte aux pommes, Mousse au chocolat" aria-label="Saisissez les choix de desserts, séparés par des virgules" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-start">
                <Button type="submit">Créer l'événement</Button>
            </div>
        </form>
    );
}
