'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adherents, evenements, inscriptions } from '@/lib/placeholder-data';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

function EventDetailSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-full" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/2" />
                </CardContent>
            </Card>

             <div className="flex justify-center">
                 <Skeleton className="h-12 w-48" />
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                     <Skeleton className="mt-2 h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <div className="flex items-center gap-4">
                                     <Skeleton className="h-4 w-24" />
                                     <Skeleton className="h-6 w-11" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const MenuChoiceSection = ({ category, options, selected, onSelect, eventId }: { category: string, options: string[], selected: string | undefined, onSelect: (value: string) => void, eventId: string }) => {
    const categoryId = `${category.toLowerCase()}-group-${eventId}`;
    return (
        <div className="space-y-2">
            <Label className="font-semibold" role="header">{category}</Label>
            <RadioGroup onValueChange={onSelect} value={selected} aria-label={`Choix pour ${category}`}>
                {options.map((option, index) => {
                    const optionId = `${categoryId}-option-${index}`;
                    return (
                         <div key={optionId} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={optionId} />
                            <Label htmlFor={optionId} className="font-normal">{option}</Label>
                        </div>
                    )
                })}
            </RadioGroup>
        </div>
    )
};


function RegisterMemberDialog({ event, adherentsList, onRegister }: { event: Evenement; adherentsList: Adherent[]; onRegister: (inscription: Inscription) => void }) {
    const [selectedAdherentId, setSelectedAdherentId] = useState<string>();
    const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
    const [isOpen, setIsOpen] = useState(false);

    const handleRegister = () => {
        if (!selectedAdherentId) return;

        const newInscription: Inscription = {
            id: `ins-${new Date().getTime()}`,
            id_evenement: event.id,
            id_adherent: selectedAdherentId,
            a_paye: false,
            date_inscription: new Date().toISOString(),
            ...(event.necessiteMenu && { choixMenu: menuChoices })
        };
        onRegister(newInscription);
        setIsOpen(false);
        // Reset form
        setSelectedAdherentId(undefined);
        setMenuChoices({});
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button size="lg" aria-label="Inscrire un nouvel adhérent à cet événement">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Inscrire un adhérent
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Inscrire un adhérent à "{event.titre}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un adhérent et remplissez les informations requises.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="adherent-select">Adhérent</Label>
                         <Select onValueChange={setSelectedAdherentId} value={selectedAdherentId}>
                            <SelectTrigger id="adherent-select" aria-label="Sélectionner un adhérent">
                                <SelectValue placeholder="Sélectionnez un adhérent" />
                            </SelectTrigger>
                            <SelectContent>
                                {adherentsList.map(adherent => (
                                    <SelectItem key={adherent.id} value={adherent.id}>
                                        {adherent.prenom} {adherent.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {event.necessiteMenu && event.optionsMenu && (
                        <Card className="p-4">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle role="header">Choix du Menu</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                                {event.optionsMenu.aperitifs && <MenuChoiceSection category="Apéritifs" options={event.optionsMenu.aperitifs} eventId={event.id} selected={menuChoices?.aperitifChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, aperitifChoisi: value}))} />}
                                {event.optionsMenu.entrees && <MenuChoiceSection category="Entrées" options={event.optionsMenu.entrees} eventId={event.id} selected={menuChoices?.entreeChoisie} onSelect={(value) => setMenuChoices(prev => ({...prev, entreeChoisie: value}))} />}
                                {event.optionsMenu.plats && <MenuChoiceSection category="Plats" options={event.optionsMenu.plats} eventId={event.id} selected={menuChoices?.platChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, platChoisi: value}))} />}
                                {event.optionsMenu.fromages && <MenuChoiceSection category="Fromages" options={event.optionsMenu.fromages} eventId={event.id} selected={menuChoices?.fromageChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, fromageChoisi: value}))} />}
                                {event.optionsMenu.desserts && <MenuChoiceSection category="Desserts" options={event.optionsMenu.desserts} eventId={event.id} selected={menuChoices?.dessertChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, dessertChoisi: value}))} />}
                            </CardContent>
                        </Card>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleRegister} disabled={!selectedAdherentId}>Inscrire</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();
    
    const [event, setEvent] = useState<Evenement | undefined>();
    const [eventInscriptions, setEventInscriptions] = useState<(Inscription & { adherent?: Adherent })[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // In a real app, you would fetch data here based on the id
        const foundEvent = evenements.find((e) => e.id === id);
        if (foundEvent) {
            setEvent(foundEvent);
            const foundInscriptions = inscriptions
                .filter(i => i.id_evenement === id)
                .map(inscription => {
                    const adherent = adherents.find(a => a.id === inscription.id_adherent);
                    return { ...inscription, adherent };
                });
            setEventInscriptions(foundInscriptions);
        }
        const timer = setTimeout(() => setLoading(false), 500); // Simulate loading
        return () => clearTimeout(timer);
    }, [id]);

    const handlePaymentStatusChange = (inscriptionId: string, hasPaid: boolean) => {
        let adherentName = '';
        setEventInscriptions(prev => 
            prev.map(inscription => {
                if (inscription.id === inscriptionId) {
                    adherentName = inscription.adherent ? `${inscription.adherent.prenom} ${inscription.adherent.nom}` : 'un adhérent';
                    return { ...inscription, a_paye: hasPaid };
                }
                return inscription;
            })
        );
        toast({
            title: "Statut de paiement mis à jour",
            description: `Le paiement de ${adherentName} a été marqué comme ${hasPaid ? 'réglé' : 'non réglé'}.`,
        });
    };
    
    const handleNewRegistration = (newInscription: Inscription) => {
        const adherent = adherents.find(a => a.id === newInscription.id_adherent);
        setEventInscriptions(prev => [...prev, { ...newInscription, adherent }]);
        if (event && adherent) {
            toast({
                title: "Inscription réussie",
                description: `${adherent.prenom} ${adherent.nom} a été inscrit à l'événement ${event.titre}.`,
            });
        }
    };
    
    const handleDelete = () => {
        console.log(`Deleting event ${event?.id}`);
        toast({
            title: "Événement supprimé",
            description: `L'événement "${event?.titre}" a été supprimé.`,
            variant: 'destructive',
        });
        router.push('/dashboard/events');
    };

    if (loading) {
        return <EventDetailSkeleton />;
    }

    if (!event) {
        return notFound();
    }
    
    const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const shortDate = new Date(event.date).toLocaleDateString('fr-FR');

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">{event.titre}</h1>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Détails de l'événement</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" aria-hidden="true" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                        <span>{event.lieu}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Euro className="h-5 w-5" aria-hidden="true" />
                        <span>{event.prix > 0 ? `${event.prix.toFixed(2)} € par participant` : "Gratuit"}</span>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-start gap-2">
                    <Link href={`/dashboard/events/${event.id}/edit`} passHref>
                        <Button variant="outline" aria-label={`Modifier l'événement ${event.titre} du ${shortDate}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                        </Button>
                    </Link>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" aria-label={`Supprimer l'événement ${event.titre} du ${shortDate}`}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Elle supprimera définitivement l'événement 
                              <span className="font-semibold"> {event.titre}</span>.
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

            <div className="flex justify-center">
                 <RegisterMemberDialog event={event} adherentsList={adherents} onRegister={handleNewRegistration} />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" aria-hidden="true" />
                        <CardTitle>Liste des Inscrits ({eventInscriptions.length})</CardTitle>
                    </div>
                    <CardDescription>Gérez les participants, leur statut de paiement et leur menu.</CardDescription>
                </CardHeader>
                <CardContent>
                    {eventInscriptions.length > 0 ? (
                        <div className="space-y-4">
                            {eventInscriptions.map(({ adherent, id: inscriptionId, a_paye, choixMenu }) => (
                               <div key={inscriptionId} className="rounded-lg border p-4">
                                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                       {adherent && (
                                           <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={`https://picsum.photos/seed/${adherent.id}/40/40`} alt={`Avatar de ${adherent.prenom} ${adherent.nom}`} data-ai-hint="avatar person" />
                                                    <AvatarFallback>{`${adherent.prenom?.[0] ?? ''}${adherent.nom?.[0] ?? ''}`.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-medium">{adherent.prenom} {adherent.nom}</p>
                                           </div>
                                       )}
                                       {event.prix > 0 && (
                                        <div className="flex w-full sm:w-auto items-center justify-end gap-4 sm:ml-auto">
                                           <Label htmlFor={`payment-status-${inscriptionId}`} className="text-sm flex-shrink-0">
                                                A payé {event.prix.toFixed(2)} €
                                           </Label>
                                            <Switch
                                                id={`payment-status-${inscriptionId}`}
                                                checked={a_paye}
                                                onCheckedChange={(checked) => handlePaymentStatusChange(inscriptionId, checked)}
                                                aria-label={`Marquer le paiement de ${adherent?.prenom} ${adherent?.nom} comme ${a_paye ? 'non réglé' : 'réglé'}`}
                                            />
                                       </div>
                                       )}
                                   </div>
                                    {choixMenu && Object.keys(choixMenu).length > 0 && (
                                        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground space-y-1">
                                            <h4 className="font-medium text-foreground">Menu choisi :</h4>
                                            {choixMenu.aperitifChoisi && <p><strong>Apéritif :</strong> {choixMenu.aperitifChoisi}</p>}
                                            {choixMenu.entreeChoisie && <p><strong>Entrée :</strong> {choixMenu.entreeChoisie}</p>}
                                            {choixMenu.platChoisi && <p><strong>Plat :</strong> {choixMenu.platChoisi}</p>}
                                            {choixMenu.fromageChoisi && <p><strong>Fromage :</strong> {choixMenu.fromageChoisi}</p>}
                                            {choixMenu.dessertChoisi && <p><strong>Dessert :</strong> {choixMenu.dessertChoisi}</p>}
                                        </div>
                                    )}
                               </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
                            <p className="text-muted-foreground">Aucun adhérent inscrit pour le moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
