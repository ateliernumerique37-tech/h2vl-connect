'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { getEvenementById, updateEvenement } from '@/services/evenementsService';
import { addLog } from '@/services/logsService';
import type { Evenement } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function EditEventSkeleton() {
    return (
         <div className="space-y-6">
            <header>
                 <Skeleton className="h-9 w-1/2" />
                 <Skeleton className="h-4 w-3/4 mt-2" />
            </header>

            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-7 w-1/3" /></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
             <div className="flex justify-start">
                <Skeleton className="h-10 w-48" />
            </div>
        </div>
    )
}

export default function EditEventPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for form fields
    const [titre, setTitre] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [lieu, setLieu] = useState('');
    const [prix, setPrix] = useState('0');
    const [necessiteMenu, setNecessiteMenu] = useState(false);
    const [aperitifs, setAperitifs] = useState('');
    const [entrees, setEntrees] = useState('');
    const [plats, setPlats] = useState('');
    const [fromages, setFromages] = useState('');
    const [desserts, setDesserts] = useState('');


    useEffect(() => {
        if (!id) return;
        async function fetchEvent() {
            try {
                const foundEvent = await getEvenementById(id);
                if (foundEvent) {
                    setTitre(foundEvent.titre);
                    setDescription(foundEvent.description);
                    // Format date for datetime-local input
                    const d = new Date(foundEvent.date);
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    setDate(d.toISOString().slice(0, 16));
                    
                    setLieu(foundEvent.lieu);
                    setPrix(foundEvent.prix.toString());
                    setNecessiteMenu(foundEvent.necessiteMenu || false);
                    if (foundEvent.optionsMenu) {
                        setAperitifs(foundEvent.optionsMenu.aperitifs?.join(', ') || '');
                        setEntrees(foundEvent.optionsMenu.entrees?.join(', ') || '');
                        setPlats(foundEvent.optionsMenu.plats?.join(', ') || '');
                        setFromages(foundEvent.optionsMenu.fromages?.join(', ') || '');
                        setDesserts(foundEvent.optionsMenu.desserts?.join(', ') || '');
                    }
                } else {
                    notFound();
                }
            } catch (error) {
                console.error("Failed to fetch event:", error);
                toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les données de l\'événement.' });
            } finally {
                setLoading(false);
            }
        }
        fetchEvent();
    }, [id, toast]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const updatedEvent: Partial<Evenement> = {
                titre,
                description,
                date: new Date(date).toISOString(),
                lieu,
                prix: parseFloat(prix),
                necessiteMenu,
            };

            if (necessiteMenu) {
                updatedEvent.optionsMenu = {
                    aperitifs: aperitifs.split(',').map(s => s.trim()).filter(Boolean),
                    entrees: entrees.split(',').map(s => s.trim()).filter(Boolean),
                    plats: plats.split(',').map(s => s.trim()).filter(Boolean),
                    fromages: fromages.split(',').map(s => s.trim()).filter(Boolean),
                    desserts: desserts.split(',').map(s => s.trim()).filter(Boolean),
                };
            }

            await updateEvenement(id, updatedEvent);
            await addLog(`Modification de l'événement : ${titre}`);

            toast({
                title: "Événement modifié",
                description: `L'événement "${titre}" a été mis à jour.`,
            });
            
            router.push(`/dashboard/events/${id}`);
        } catch (error) {
            console.error("Failed to update event:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier l\'événement.' });
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <EditEventSkeleton />;
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <header>
                 <h1 className="text-3xl font-bold tracking-tight">Modifier l'événement</h1>
                 <p className="text-muted-foreground">Mettez à jour les détails de l'événement.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Informations principales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="titre">Titre de l'événement</Label>
                        <Input id="titre" name="titre" required value={titre} onChange={(e) => setTitre(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" required value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date et Heure</Label>
                            <Input id="date" name="date" type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lieu">Lieu</Label>
                            <Input id="lieu" name="lieu" required value={lieu} onChange={(e) => setLieu(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prix">Prix (€)</Label>
                        <Input id="prix" name="prix" type="number" min="0" step="0.01" required value={prix} onChange={(e) => setPrix(e.target.value)} />
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
                                <Input id="aperitifs" name="aperitifs" placeholder="Ex: Kir, Jus de fruit" value={aperitifs} onChange={(e) => setAperitifs(e.target.value)} aria-label="Saisissez les choix d'apéritifs, séparés par des virgules" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entrees">Entrées</Label>
                                <Input id="entrees" name="entrees" placeholder="Ex: Salade composée, Velouté de saison" value={entrees} onChange={(e) => setEntrees(e.target.value)} aria-label="Saisissez les choix d'entrées, séparés par des virgules" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plats">Plats</Label>
                                <Input id="plats" name="plats" placeholder="Ex: Poulet rôti, Option végétarienne" value={plats} onChange={(e) => setPlats(e.target.value)} aria-label="Saisissez les choix de plats, séparés par des virgules" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fromages">Salade ou Fromages</Label>
                                <Input id="fromages" name="fromages" placeholder="Ex: Assiette de fromages, Fromage blanc" value={fromages} onChange={(e) => setFromages(e.target.value)} aria-label="Saisissez les choix de fromages, séparés par des virgules" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="desserts">Desserts</Label>
                                <Input id="desserts" name="desserts" placeholder="Ex: Tarte aux pommes, Mousse au chocolat" value={desserts} onChange={(e) => setDesserts(e.target.value)} aria-label="Saisissez les choix de desserts, séparés par des virgules" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-start">
                <Button type="submit" disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
                </Button>
            </div>
        </form>
    );
}
