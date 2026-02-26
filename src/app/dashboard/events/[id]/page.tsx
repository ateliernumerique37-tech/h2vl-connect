'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { addInscription, updateInscription } from '@/services/inscriptionsService';
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
    const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
    const [isOpen, setIsOpen] = useState(false);

    const handleRegister = () => {
        if (!selectedAdherentId) return;

        const newInscription: Omit<Inscription, 'id' | 'date_inscription'> = {
            id_evenement: event.id,
            id_adherent: selectedAdherentId,
            a_paye: false,
            ...(event.necessiteMenu && { choixMenu: menuChoices })
        };
        onRegister(newInscription);
        setIsOpen(false);
        setSelectedAdherentId(undefined);
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Inscription à "{event.titre}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un adhérent pour cet événement.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="adherent-select">Choisir l'adhérent</Label>
                         <Select onValueChange={setSelectedAdherentId} value={selectedAdherentId}>
                            <SelectTrigger id="adherent-select" aria-label="Sélectionner l'adhérent dans la liste">
                                <SelectValue placeholder="Sélectionnez un adhérent" />
                            </SelectTrigger>
                            <SelectContent>
                                {adherentsList.length > 0 ? (
                                    adherentsList.map(adherent => (
                                        <SelectItem key={adherent.id} value={adherent.id}>
                                            {adherent.prenom} {adherent.nom}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        Aucun adhérent trouvé
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {event.necessiteMenu && event.optionsMenu && (
                        <div className="space-y-4 border rounded-lg p-4">
                            <h4 className="font-semibold">Choix du Menu</h4>
                            {event.optionsMenu.aperitifs && <MenuChoiceSection category="Apéritifs" options={event.optionsMenu.aperitifs} eventId={event.id} selected={menuChoices?.aperitifChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, aperitifChoisi: value}))} />}
                            {event.optionsMenu.entrees && <MenuChoiceSection category="Entrées" options={event.optionsMenu.entrees} eventId={event.id} selected={menuChoices?.entreeChoisie} onSelect={(value) => setMenuChoices(prev => ({...prev, entreeChoisie: value}))} />}
                            {event.optionsMenu.plats && <MenuChoiceSection category="Plats" options={event.optionsMenu.plats} eventId={event.id} selected={menuChoices?.platChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, platChoisi: value}))} />}
                            {event.optionsMenu.fromages && <MenuChoiceSection category="Fromages" options={event.optionsMenu.fromages} eventId={event.id} selected={menuChoices?.fromageChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, fromageChoisi: value}))} />}
                            {event.optionsMenu.desserts && <MenuChoiceSection category="Desserts" options={event.optionsMenu.desserts} eventId={event.id} selected={menuChoices?.dessertChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, dessertChoisi: value}))} />}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleRegister} disabled={!selectedAdherentId}>Valider l'inscription</Button>
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

    // Utilisation d'une requête explicite pour les adhérents
    const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents')), [db]);
    const { data: adherentsList, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);

    const inscriptionsQuery = useMemoFirebase(() => query(collection(db, 'inscriptions'), where('id_evenement', '==', id)), [db, id]);
    const { data: inscriptionsData, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

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
            
            const adherent = adherentsList?.find(a => a.id === inscriptionData.id_adherent);
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
    
    const handleDelete = async () => {
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

    if (isLoadingEvent || isLoadingInscriptions) {
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
                            <AlertDialogAction onClick={handleDelete}>Confirmer la suppression</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                </CardFooter>
            </Card>

            <div className="flex justify-center">
                 {isLoadingAdherents ? (
                    <Button disabled size="lg">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Chargement des adhérents...
                    </Button>
                 ) : adherentsList ? (
                    <RegisterMemberDialog event={event} adherentsList={adherentsList} onRegister={handleNewRegistration} />
                 ) : (
                    <div className="text-muted-foreground italic">
                        Impossible de charger la liste des adhérents.
                    </div>
                 )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" aria-hidden="true" />
                        <CardTitle>Liste des Inscrits ({inscriptionsData?.length || 0})</CardTitle>
                    </div>
                    <CardDescription>Mise à jour instantanée des participants.</CardDescription>
                </CardHeader>
                <CardContent>
                    {inscriptionsData && inscriptionsData.length > 0 ? (
                        <div className="space-y-4">
                            {inscriptionsData.map((inscription) => {
                                const adherent = adherentsList?.find(a => a.id === inscription.id_adherent);
                                return (
                                   <div key={inscription.id} className="rounded-lg border p-4">
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
                                           <div className="flex w-full sm:w-auto items-center justify-end gap-4 sm:ml-auto">
                                                <Label htmlFor={`payment-${inscription.id}`} className="text-sm">
                                                     A payé {event.prix.toFixed(2)} €
                                                </Label>
                                                 <Switch
                                                     id={`payment-${inscription.id}`}
                                                     checked={inscription.a_paye}
                                                     onCheckedChange={(checked) => handlePaymentStatusChange(inscription.id, checked)}
                                                     aria-label={`Statut de paiement pour ${adherent?.prenom} ${adherent?.nom}`}
                                                 />
                                            </div>
                                       </div>
                                        {inscription.choixMenu && (
                                            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                                                <h4 className="font-medium text-foreground mb-1">Menu :</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                                    {Object.entries(inscription.choixMenu).map(([k, v]) => v && (
                                                        <p key={k}><strong>{k.replace('Choisi', '').replace('Choisie', '')} :</strong> {v}</p>
                                                    ))}
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
