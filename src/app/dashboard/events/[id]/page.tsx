'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2, UserMinus, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteEvenement } from '@/services/evenementsService';
import { addInscription, updateInscription, deleteInscription } from '@/services/inscriptionsService';
import { addLog } from '@/services/logsService';
import { useAuth, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';

function EventDetailSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-full" />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/2" />
                </CardContent>
            </Card>
        </div>
    );
}

const MenuChoiceSection = ({ category, options, selected, onSelect, eventId }: { category: string, options: string[], selected: string | undefined, onSelect: (value: string) => void, eventId: string }) => {
    return (
        <div className="space-y-2">
            <Label className="font-semibold">{category}</Label>
            <RadioGroup onValueChange={onSelect} value={selected} aria-label={`Choix pour ${category}`}>
                {options.map((option, index) => {
                    const optionId = `${category}-${eventId}-${index}`;
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


function RegisterMemberDialog({ event, adherentsList, onRegister, isLoadingAdherents }: { event: Evenement; adherentsList: Adherent[]; onRegister: (inscription: Omit<Inscription, 'id' | 'date_inscription'>) => Promise<void>; isLoadingAdherents: boolean }) {
    const [selectedAdherentId, setSelectedAdherentId] = useState<string>("");
    const [isPaid, setIsPaid] = useState(false);
    const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Réinitialisation lors de l'ouverture
    useEffect(() => {
        if (isOpen) {
            setSelectedAdherentId("");
            setIsPaid(false);
            setMenuChoices({});
        }
    }, [isOpen]);

    const handleRegister = async () => {
        if (!selectedAdherentId) return;

        setIsSubmitting(true);
        try {
            const newInscription: Omit<Inscription, 'id' | 'date_inscription'> = {
                id_evenement: event.id,
                id_adherent: selectedAdherentId,
                a_paye: isPaid,
                ...(event.necessiteMenu && { choixMenu: menuChoices })
            };
            await onRegister(newInscription);
            setIsOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button size="lg" className="w-full sm:w-auto" aria-label={`Inscrire un adhérent à l'événement ${event.titre}`}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Inscrire un adhérent
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" role="dialog" aria-modal="true">
                <DialogHeader>
                    <DialogTitle>Inscription à "{event.titre}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un adhérent parmi la liste des membres non encore inscrits.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="adherent-select">Choisir l'adhérent</Label>
                         <Select onValueChange={setSelectedAdherentId} value={selectedAdherentId}>
                            <SelectTrigger id="adherent-select" className="w-full" aria-label="Zone de liste des adhérents disponibles">
                                <SelectValue placeholder={isLoadingAdherents ? "Chargement..." : (adherentsList.length > 0 ? "Sélectionnez un adhérent" : "Aucun adhérent disponible")} />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingAdherents ? (
                                    <SelectItem value="loading" disabled>Chargement des données...</SelectItem>
                                ) : (
                                    <>
                                        {adherentsList.length === 0 ? (
                                            <SelectItem value="none" disabled>Tous les membres sont déjà inscrits</SelectItem>
                                        ) : (
                                            adherentsList.map(adherent => (
                                                <SelectItem key={adherent.id} value={adherent.id}>
                                                    {adherent.prenom} {adherent.nom}
                                                </SelectItem>
                                            ))
                                        )}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                        <Label htmlFor="paid-toggle-init" className="font-medium cursor-pointer">L'adhérent a déjà payé ?</Label>
                        <Switch 
                            id="paid-toggle-init" 
                            checked={isPaid} 
                            onCheckedChange={setIsPaid} 
                            aria-label="Statut du paiement immédiat"
                        />
                    </div>

                    {event.necessiteMenu && event.optionsMenu && (
                        <div className="space-y-4 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                            <h4 className="font-semibold sticky top-0 bg-background pb-2 border-b">Choix du Menu</h4>
                            {event.optionsMenu.aperitifs && event.optionsMenu.aperitifs.length > 0 && (
                                <MenuChoiceSection category="Apéritif" options={event.optionsMenu.aperitifs} eventId={event.id} selected={menuChoices?.aperitifChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, aperitifChoisi: value}))} />
                            )}
                            {event.optionsMenu.entrees && event.optionsMenu.entrees.length > 0 && (
                                <MenuChoiceSection category="Entrée" options={event.optionsMenu.entrees} eventId={event.id} selected={menuChoices?.entreeChoisie} onSelect={(value) => setMenuChoices(prev => ({...prev, entreeChoisie: value}))} />
                            )}
                            {event.optionsMenu.plats && event.optionsMenu.plats.length > 0 && (
                                <MenuChoiceSection category="Plat principal" options={event.optionsMenu.plats} eventId={event.id} selected={menuChoices?.platChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, platChoisi: value}))} />
                            )}
                            {event.optionsMenu.fromages && event.optionsMenu.fromages.length > 0 && (
                                <MenuChoiceSection category="Fromage" options={event.optionsMenu.fromages} eventId={event.id} selected={menuChoices?.fromageChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, fromageChoisi: value}))} />
                            )}
                            {event.optionsMenu.desserts && event.optionsMenu.desserts.length > 0 && (
                                <MenuChoiceSection category="Dessert" options={event.optionsMenu.desserts} eventId={event.id} selected={menuChoices?.dessertChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, dessertChoisi: value}))} />
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleRegister} disabled={!selectedAdherentId || selectedAdherentId === "loading" || selectedAdherentId === "none" || isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Valider l'inscription
                    </Button>
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
    const db = useFirestore();
    const auth = useAuth();
    
    const eventRef = useMemoFirebase(() => id ? doc(db, 'evenements', id) : null, [db, id]);
    const { data: event, isLoading: isLoadingEvent } = useDoc<Evenement>(eventRef);

    // Récupération brute des adhérents
    const adherentsColl = useMemoFirebase(() => collection(db, 'adherents'), [db]);
    const { data: rawAdherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsColl);

    // Récupération brute des inscriptions pour filtrage manuel côté client (plus fiable que where)
    const inscriptionsColl = useMemoFirebase(() => collection(db, 'inscriptions'), [db]);
    const { data: allInscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsColl);

    // Calcul des inscriptions spécifiques à cet événement
    const eventInscriptions = useMemo(() => {
        if (!allInscriptions) return [];
        return allInscriptions.filter(ins => ins.id_evenement === id);
    }, [allInscriptions, id]);

    // Calcul fiable des adhérents non inscrits
    const nonRegisteredAdherents = useMemo(() => {
        if (!rawAdherents) return [];
        const registeredIds = new Set(eventInscriptions.map(ins => ins.id_adherent));
        return rawAdherents
            .filter(adherent => !registeredIds.has(adherent.id))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [rawAdherents, eventInscriptions]);

    const handlePaymentStatusChange = async (inscriptionId: string, hasPaid: boolean) => {
        try {
            await updateInscription(db, inscriptionId, { a_paye: hasPaid });
            toast({
                title: "Paiement mis à jour",
                description: `Le statut a été modifié avec succès.`,
            });
        } catch (error) {
            console.error("Failed to update payment status:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier le statut de paiement.' });
        }
    };
    
    const handleNewRegistration = async (inscriptionData: Omit<Inscription, 'id' | 'date_inscription'>) => {
        try {
            const newInscriptionData = {
                ...inscriptionData,
                date_inscription: new Date().toISOString()
            };
            await addInscription(db, newInscriptionData);
            
            const adherent = rawAdherents?.find(a => a.id === inscriptionData.id_adherent);
            if (event && adherent) {
                await addLog(db, auth, `Inscription de ${adherent.prenom} ${adherent.nom} à l'événement ${event.titre}`);
                toast({
                    title: "Adhérent inscrit",
                    description: `${adherent.prenom} ${adherent.nom} a été ajouté à la liste des participants.`,
                });
            }
        } catch (error) {
            console.error("Failed to register adherent:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de l\'inscription.' });
            throw error;
        }
    };

    const handleUnregister = async (inscriptionId: string, adherentName: string) => {
        try {
            await deleteInscription(db, inscriptionId);
            if (event) {
                await addLog(db, auth, `Désinscription de ${adherentName} de l'événement ${event.titre}`);
                toast({
                    title: "Désinscription réussie",
                    description: `${adherentName} a été retiré de la liste des participants.`,
                });
            }
        } catch (error) {
            console.error("Failed to unregister:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de désinscrire l\'adhérent.' });
        }
    };
    
    const handleDeleteEvent = async () => {
        if (!event) return;
        try {
            await deleteEvenement(db, event.id);
            await addLog(db, auth, `Suppression de l'événement : ${event.titre}`);
            toast({
                title: "Événement supprimé",
                description: `L'événement a été retiré avec succès.`,
            });
            router.push('/dashboard/events');
        } catch (error) {
            console.error("Failed to delete event:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer l\'événement.' });
        }
    };

    if (isLoadingEvent) {
        return <EventDetailSkeleton />;
    }

    if (!event) {
        return notFound();
    }
    
    const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{event.titre}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        <span>{event.lieu}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Euro className="h-4 w-4" aria-hidden="true" />
                        <span className="font-semibold text-foreground">{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span>
                    </div>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                            {event.description}
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
                        <Link href={`/dashboard/events/${event.id}/edit`} passHref>
                            <Button variant="outline" size="sm" aria-label={`Modifier l'événement ${event.titre}`}>
                                <Pencil className="mr-2 h-4 w-4" /> Modifier
                            </Button>
                        </Link>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" aria-label={`Supprimer l'événement ${event.titre}`}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Voulez-vous vraiment supprimer l'événement <strong>{event.titre}</strong> ? Toutes les inscriptions seront également supprimées.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Supprimer l'événement
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    <RegisterMemberDialog 
                        event={event} 
                        adherentsList={nonRegisteredAdherents} 
                        onRegister={handleNewRegistration} 
                        isLoadingAdherents={isLoadingAdherents}
                    />

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-lg">Inscrits</CardTitle>
                                </div>
                                <span className="text-2xl font-bold">{eventInscriptions.length}</span>
                            </div>
                            <CardDescription>Liste actualisée des participants.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-2">
                            {isLoadingInscriptions ? (
                                <div className="space-y-3 p-2">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : eventInscriptions.length > 0 ? (
                                <div className="space-y-1">
                                    {eventInscriptions.map((inscription) => {
                                        const adherent = rawAdherents?.find(a => a.id === inscription.id_adherent);
                                        const adherentName = adherent ? `${adherent.prenom} ${adherent.nom}` : "Adhérent inconnu";
                                        
                                        return (
                                           <div key={inscription.id} className="group flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                               <div className="flex items-center justify-between gap-3">
                                                   <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={`https://picsum.photos/seed/${inscription.id_adherent}/32/32`} alt={adherentName} data-ai-hint="avatar person" />
                                                            <AvatarFallback className="text-[10px]">{adherent ? `${adherent.prenom?.[0] ?? ''}${adherent.nom?.[0] ?? ''}`.toUpperCase() : '??'}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium truncate">{adherentName}</span>
                                                   </div>
                                                   <div className="flex items-center gap-2 shrink-0">
                                                        <Switch
                                                            id={`payment-${inscription.id}`}
                                                            checked={inscription.a_paye}
                                                            onCheckedChange={(checked) => handlePaymentStatusChange(inscription.id, checked)}
                                                            className="scale-75"
                                                            aria-label={`Paiement pour ${adherentName}`}
                                                        />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" aria-label={`Désinscrire ${adherentName}`}>
                                                                    <UserMinus className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Désinscription</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Voulez-vous retirer <strong>{adherentName}</strong> de cet événement ?
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleUnregister(inscription.id, adherentName)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                        Désinscrire
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                               </div>
                                                {inscription.choixMenu && (
                                                    <div className="mt-1 flex flex-wrap gap-1 border-t pt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                                                        {Object.entries(inscription.choixMenu).map(([key, value]) => value && (
                                                            <span key={key} className="bg-muted px-1.5 py-0.5 rounded">{value}</span>
                                                        ))}
                                                    </div>
                                                )}
                                           </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                 <div className="p-8 text-center text-sm text-muted-foreground italic">
                                    Aucun participant pour le moment.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
