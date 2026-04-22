'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addEvenement } from '@/services/evenementsService';
import { addLog } from '@/services/logsService';
import type { Evenement } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';

export default function CreateEventPage() {
    const [necessiteMenu, setNecessiteMenu] = useState(false);
    const [estSortieBowling, setEstSortieBowling] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const db = useFirestore();
    const auth = useAuth();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        
        try {
            const newEvent: Omit<Evenement, 'id'> = {
                titre: formData.get('titre') as string,
                description: formData.get('description') as string,
                date: new Date(formData.get('date') as string).toISOString(),
                lieu: formData.get('lieu') as string,
                prix: parseFloat(formData.get('prix') as string),
                nombrePlacesMax: parseInt(formData.get('nombrePlacesMax') as string, 10),
                imageId: `event-${Math.floor(Math.random() * 6) + 1}`, // Temporary random image
                necessiteMenu: formData.get('necessiteMenu') === 'on',
                optionsMenu: {},
                estSortieBowling,
                ...(formData.get('dateFin')
                  ? { dateFin: new Date(formData.get('dateFin') as string).toISOString() }
                  : {}),
                ...(formData.get('dateLimiteInscription')
                  ? { dateLimiteInscription: new Date(formData.get('dateLimiteInscription') as string).toISOString() }
                  : {}),
            };
            
            if (newEvent.necessiteMenu) {
                const optionsMenu: { [key: string]: string[] } = {};
                const aperitifs = formData.get('aperitifs') as string;
                const entrees = formData.get('entrees') as string;
                const plats = formData.get('plats') as string;
                const fromages = formData.get('fromages') as string;
                const desserts = formData.get('desserts') as string;

                if (aperitifs) optionsMenu.aperitifs = aperitifs.split(',').map(s => s.trim()).filter(Boolean);
                if (entrees) optionsMenu.entrees = entrees.split(',').map(s => s.trim()).filter(Boolean);
                if (plats) optionsMenu.plats = plats.split(',').map(s => s.trim()).filter(Boolean);
                if (fromages) optionsMenu.fromages = fromages.split(',').map(s => s.trim()).filter(Boolean);
                if (desserts) optionsMenu.desserts = desserts.split(',').map(s => s.trim()).filter(Boolean);
                newEvent.optionsMenu = optionsMenu;
            }

            await addEvenement(db, newEvent);
            await addLog(db, auth, `Création de l'événement : ${newEvent.titre}`);
            
            toast({
                title: "Événement créé",
                description: `L'événement "${newEvent.titre}" a été créé avec succès.`,
            });
            router.push('/dashboard/events');

        } catch (error) {
            console.error("Failed to create event:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer l'événement." });
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="space-y-6">
             <header>
                 <h1 className="text-3xl font-bold tracking-tight">Créer un nouvel événement</h1>
                 <p className="text-muted-foreground">Remplissez les détails ci-dessous pour organiser une nouvelle activité.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
                <Card>
                    <CardHeader>
                        <CardTitle>Informations principales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="titre">Titre de l'événement</Label>
                            <Input id="titre" name="titre" required maxLength={100} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" required maxLength={2000} />
                        </div>
                         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date et Heure</Label>
                                <Input id="date" name="date" type="datetime-local" required aria-describedby="date-format-hint" />
                                <p id="date-format-hint" className="text-xs text-muted-foreground">Format : JJ/MM/AAAA HH:MM</p>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="lieu">Lieu</Label>
                                <Input id="lieu" name="lieu" required maxLength={200} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="dateFin">
                                    Date de fin
                                    <span className="ml-2 font-normal text-muted-foreground text-xs">(optionnel)</span>
                                </Label>
                                <Input
                                    id="dateFin"
                                    name="dateFin"
                                    type="datetime-local"
                                    aria-label="Date de fin de l'événement — optionnel"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateLimiteInscription">
                                    Date limite d'inscription
                                    <span className="ml-2 font-normal text-muted-foreground text-xs">(optionnel)</span>
                                </Label>
                                <Input
                                    id="dateLimiteInscription"
                                    name="dateLimiteInscription"
                                    type="datetime-local"
                                    aria-label="Date limite d'inscription — optionnel"
                                    aria-describedby="date-limite-help"
                                />
                                <p id="date-limite-help" className="text-xs text-muted-foreground">
                                    Si renseignée, les inscriptions seront automatiquement fermées après cette date.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                              <Label htmlFor="prix">Prix (€)</Label>
                              <Input id="prix" name="prix" type="number" min="0" step="0.01" defaultValue="0" required />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="nombrePlacesMax">Nombre de places max</Label>
                              <Input id="nombrePlacesMax" name="nombrePlacesMax" type="number" min="1" defaultValue="50" required />
                          </div>
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

                <Card>
                    <CardHeader>
                        <h2 className="text-2xl font-semibold leading-none tracking-tight">Options bowling</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="estSortieBowling" className="flex flex-col space-y-1 pr-4">
                                <span>C'est une sortie bowling</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                    Si coché, lors de l'inscription d'un membre vous pourrez préciser ses préférences bowling.
                                </span>
                            </Label>
                            <Switch
                                id="estSortieBowling"
                                checked={estSortieBowling}
                                onCheckedChange={setEstSortieBowling}
                                aria-label="Activer les options bowling pour cet événement"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => router.push('/dashboard/events')} disabled={isSubmitting} className="min-h-[44px]">
                        Annuler
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Créer l'événement
                    </Button>
                </div>
            </form>
        </div>
    );
}
