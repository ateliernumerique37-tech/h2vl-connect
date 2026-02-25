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
import AiEventForm from '@/components/admin/ai-event-form';
import { addEvenement } from '@/services/evenementsService';
import { addLog } from '@/services/logsService';
import type { Evenement } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';

export default function CreateEventPage() {
    const [necessiteMenu, setNecessiteMenu] = useState(false);
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
                imageId: `event-${Math.floor(Math.random() * 6) + 1}`, // Temporary random image
                necessiteMenu: formData.get('necessiteMenu') === 'on',
                optionsMenu: {},
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
            toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de créer l'événement." });
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="space-y-6">
             <header>
                 <h1 className="text-3xl font-bold tracking-tight">Créer un nouvel événement</h1>
                 <p className="text-muted-foreground">Remplissez les détails ci-dessous ou utilisez l'assistant IA pour générer une description.</p>
            </header>
            
            <AiEventForm />
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou remplir manuellement
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Créer l'événement
                    </Button>
                </div>
            </form>
        </div>
    );
}
