'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2, UserMinus } from 'lucide-react';
import { useState } from 'react';
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
import { doc, collection, query, where } from 'firebase/firestore';

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


function RegisterMemberDialog({ event, adherentsList, onRegister }: { event: Evenement; adherentsList: Adherent[]; onRegister: (inscription: Omit<Inscription, 'id' | 'date_inscription'>) => void }) {
    const [selectedAdherentId, setSelectedAdherentId] = useState<string>();
    const [isPaid, setIsPaid] = useState(false);
    const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
    const [isOpen, setIsOpen] = useState(false);

    const handleRegister = () => {
        if (!selectedAdherentId) return;

        const newInscription: Omit<Inscription, 'id' | 'date_inscription'> = {
            id_evenement: event.id,
            id_adherent: selectedAdherentId,
            a_paye: isPaid,
            ...(event.necessiteMenu && { choixMenu: menuChoices })
        };
        onRegister(newInscription);
        setIsOpen(false);
        // Reset state
        setSelectedAdherentId(undefined);
        setIsPaid(false);
        setMenuChoices({});
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button size="lg" aria-label={`Inscrire un adhérent à l'événement ${event.titre}`}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Inscrire un adhérent
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" role="dialog" aria-modal="true">
                <DialogHeader>
                    <DialogTitle>Inscription à "{event.titre}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un adhérent et configurez son inscription.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="adherent-select">Choisir l'adhérent</Label>
                         <Select onValueChange={setSelectedAdherentId} value={selectedAdherentId}>
                            <SelectTrigger id="adherent-select" className="w-full" aria-label="Zone de liste : Sélectionner l'adhérent à inscrire">
                                <SelectValue placeholder={adherentsList.length > 0 ? "Sélectionnez un adhérent" : "Aucun adhérent disponible"} />
                            </SelectTrigger>
                            <SelectContent>
                                {adherentsList.length > 0 ? (
                                    adherentsList.map(adherent => (
                                        <SelectItem key={adherent.id} value={adherent.id}>
                                            {adherent.prenom} {adherent.nom}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Tous les adhérents sont déjà inscrits.
                                    </div>
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
                            aria-label="Cocher si le paiement est effectué dès l'inscription"
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
                    <Button onClick={handleRegister} disabled={!selectedAdherentId} className="w-full sm:w-auto">
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
    
    const eventRef = useMemoFirebase(() => doc(db, 'evenements', id), [db, id]);
    const { data: event, isLoading: isLoadingEvent } = useDoc<Evenement>(eventRef);

    const adherentsColl = useMemoFirebase(() => collection(db, 'adherents'), [db]);
    const { data: rawAdherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsColl);

    const inscriptionsQuery = useMemoFirebase(() => query(collection(db, 'inscriptions'), where('id_evenement', '==', id)), [db, id]);
    const { data: inscriptionsData, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

    const nonRegisteredAdherents = (rawAdherents || []).filter(adherent => 
        !(inscriptionsData || []).some(ins => ins.id_adherent === adherent.id)
    ).sort((a, b) => a.nom.localeCompare(b.nom));

    const handlePaymentStatusChange = async (inscriptionId: string, hasPaid: boolean) => {
        try {
            await updateInscription(db, inscriptionId, { a_paye: hasPaid });
            toast({
                title: "Paiement mis à jour",
                description: `Le statut a été modifié.`,
            });
        } catch (error) {
            console.error("Failed to update payment status:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier le statut.' });
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
                    description: `${adherent.prenom} ${adherent.nom} a été ajouté à la liste.`,
                });
            }
        } catch (error) {
            console.error("Failed to register adherent:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'inscrire l\'adhérent.' });
        }
    };

    const handleUnregister = async (inscriptionId: string, adherentName: string) => {
        try {
            await deleteInscription(db, inscriptionId);
            if (event) {
                await addLog(db, auth, `Désinscription de ${adherentName} de l'événement ${event.titre}`);
                toast({
                    title: "Désinscription réussie",
                    description: `${adherentName} a été retiré de la liste.`,
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

    if (isLoadingEvent || isLoadingInscriptions || isLoadingAdherents) {
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
                        <span>{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-start gap-4">
                    <Link href={`/dashboard/events/${event.id}/edit`} passHref>
                        <Button variant="outline" aria-label={`Modifier les détails de l'événement ${event.titre}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                        </Button>
                    </Link>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" aria-label={`Supprimer définitivement l'événement ${event.titre}`}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action supprimera l'événement <strong>{event.titre}</strong> et toutes les inscriptions liées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmer la suppression</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                </CardFooter>
            </Card>

            <div className="flex justify-center">
                 <RegisterMemberDialog event={event} adherentsList={nonRegisteredAdherents} onRegister={handleNewRegistration} />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" aria-hidden="true" />
                        <CardTitle>Liste des Inscrits ({inscriptionsData?.length || 0})</CardTitle>
                    </div>
                    <CardDescription>Mise à jour instantanée des participants et de leurs statuts.</CardDescription>
                </CardHeader>
                <CardContent>
                    {inscriptionsData && inscriptionsData.length > 0 ? (
                        <div className="space-y-4">
                            {inscriptionsData.map((inscription) => {
                                const adherent = rawAdherents?.find(a => a.id === inscription.id_adherent);
                                const adherentName = adherent ? `${adherent.prenom} ${adherent.nom}` : "Adhérent supprimé";
                                
                                return (
                                   <div key={inscription.id} className="rounded-lg border p-4 transition-all hover:shadow-sm">
                                       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                           <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={`https://picsum.photos/seed/${inscription.id_adherent}/40/40`} alt={`Avatar de ${adherentName}`} data-ai-hint="avatar person" />
                                                    <AvatarFallback>{adherent ? `${adherent.prenom?.[0] ?? ''}${adherent.nom?.[0] ?? ''}`.toUpperCase() : '??'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{adherentName}</p>
                                                    {!adherent && <p className="text-xs text-destructive">Profil supprimé de la base</p>}
                                                </div>
                                           </div>
                                           <div className="flex w-full sm:w-auto items-center justify-end gap-4 sm:ml-auto">
                                                <div className="flex items-center gap-2 mr-4">
                                                    <Label htmlFor={`payment-${inscription.id}`} className="text-sm cursor-pointer">
                                                         A payé
                                                    </Label>
                                                     <Switch
                                                         id={`payment-${inscription.id}`}
                                                         checked={inscription.a_paye}
                                                         onCheckedChange={(checked) => handlePaymentStatusChange(inscription.id, checked)}
                                                         aria-label={`Statut de paiement pour ${adherentName}`}
                                                     />
                                                </div>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" aria-label={`Désinscrire ${adherentName}`}>
                                                            <UserMinus className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirmer la désinscription</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Voulez-vous retirer <strong>{adherentName}</strong> de la liste des participants pour cet événement ?
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
                                            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                                                <h4 className="font-medium text-foreground mb-1">Menu choisi :</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                                    {inscription.choixMenu.aperitifChoisi && <p><strong>Apéritif :</strong> {inscription.choixMenu.aperitifChoisi}</p>}
                                                    {inscription.choixMenu.entreeChoisie && <p><strong>Entrée :</strong> {inscription.choixMenu.entreeChoisie}</p>}
                                                    {inscription.choixMenu.platChoisi && <p><strong>Plat principal :</strong> {inscription.choixMenu.platChoisi}</p>}
                                                    {inscription.choixMenu.fromageChoisi && <p><strong>Fromage :</strong> {inscription.choixMenu.fromageChoisi}</p>}
                                                    {inscription.choixMenu.dessertChoisi && <p><strong>Dessert :</strong> {inscription.choixMenu.dessertChoisi}</p>}
                                                </div>
                                            </div>
                                        )}
                                   </div>
                                )
                            })}
                        </div>
                    ) : (
                         <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
                            <p className="text-muted-foreground">Aucun inscrit pour le moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}