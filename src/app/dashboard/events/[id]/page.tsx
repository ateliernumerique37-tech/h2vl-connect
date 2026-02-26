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
import { doc, collection, query } from 'firebase/firestore';

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


function RegisterMemberDialog({ event, adherentsList, onRegister, isLoading }: { event: Evenement; adherentsList: Adherent[]; onRegister: (inscription: Omit<Inscription, 'id' | 'date_inscription'>) => Promise<void>; isLoading: boolean }) {
    const [selectedAdherentId, setSelectedAdherentId] = useState<string>("");
    const [isPaid, setIsPaid] = useState(false);
    const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when dialog closes or opens
    useEffect(() => {
        if (!isOpen) {
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Inscription à "{event.titre}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un membre de l'association pour l'inscrire à cet événement.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="adherent-select">Choisir l'adhérent</Label>
                        {!isLoading && adherentsList.length > 0 ? (
                            <Select onValueChange={setSelectedAdherentId} value={selectedAdherentId}>
                                <SelectTrigger id="adherent-select" className="w-full" aria-label="Liste des adhérents disponibles">
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
                        ) : (
                            <div className="flex items-center justify-center p-3 border rounded-md bg-muted/20 text-sm text-muted-foreground">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement des adhérents...</>
                                ) : (
                                    "Aucun adhérent disponible pour inscription"
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                        <Label htmlFor="paid-toggle" className="font-medium cursor-pointer">L'adhérent a-t-il déjà payé ?</Label>
                        <Switch id="paid-toggle" checked={isPaid} onCheckedChange={setIsPaid} aria-label="Statut de paiement à l'inscription" />
                    </div>

                    {event.necessiteMenu && event.optionsMenu && (
                        <div className="space-y-4 border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-muted/5">
                            <h4 className="font-semibold border-b pb-2">Choix du Menu</h4>
                            {event.optionsMenu.aperitifs?.length ? (
                                <MenuChoiceSection category="Apéritif" options={event.optionsMenu.aperitifs} eventId={event.id} selected={menuChoices?.aperitifChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, aperitifChoisi: value}))} />
                            ) : null}
                            {event.optionsMenu.entrees?.length ? (
                                <MenuChoiceSection category="Entrée" options={event.optionsMenu.entrees} eventId={event.id} selected={menuChoices?.entreeChoisie} onSelect={(value) => setMenuChoices(prev => ({...prev, entreeChoisie: value}))} />
                            ) : null}
                            {event.optionsMenu.plats?.length ? (
                                <MenuChoiceSection category="Plat principal" options={event.optionsMenu.plats} eventId={event.id} selected={menuChoices?.platChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, platChoisi: value}))} />
                            ) : null}
                            {event.optionsMenu.fromages?.length ? (
                                <MenuChoiceSection category="Fromage" options={event.optionsMenu.fromages} eventId={event.id} selected={menuChoices?.fromageChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, fromageChoisi: value}))} />
                            ) : null}
                            {event.optionsMenu.desserts?.length ? (
                                <MenuChoiceSection category="Dessert" options={event.optionsMenu.desserts} eventId={event.id} selected={menuChoices?.dessertChoisi} onSelect={(value) => setMenuChoices(prev => ({...prev, dessertChoisi: value}))} />
                            ) : null}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleRegister} disabled={!selectedAdherentId || isSubmitting} className="w-full">
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
    const id = params?.id as string;
    const { toast } = useToast();
    const db = useFirestore();
    const auth = useAuth();
    
    // Recovery of the event
    const eventRef = useMemoFirebase(() => id ? doc(db, 'evenements', id) : null, [db, id]);
    const { data: event, isLoading: isLoadingEvent } = useDoc<Evenement>(eventRef);

    // Recovery of members (Same logic as in AdherentsPage)
    const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents')), [db]);
    const { data: rawAdherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);

    // Recovery of ALL inscriptions for client-side filtering (Avoid index requirements)
    const inscriptionsQuery = useMemoFirebase(() => query(collection(db, 'inscriptions')), [db]);
    const { data: allInscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

    // Participants of this specific event
    const eventInscriptions = useMemo(() => {
        if (!allInscriptions || !id) return [];
        return allInscriptions.filter(ins => ins.id_evenement === id);
    }, [allInscriptions, id]);

    // Members not yet registered
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
            toast({ title: "Statut de paiement mis à jour" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le paiement.' });
        }
    };
    
    const handleNewRegistration = async (inscriptionData: Omit<Inscription, 'id' | 'date_inscription'>) => {
        try {
            await addInscription(db, { ...inscriptionData, date_inscription: new Date().toISOString() });
            const adherent = rawAdherents?.find(a => a.id === inscriptionData.id_adherent);
            if (event && adherent) {
                await addLog(db, auth, `Inscription de ${adherent.prenom} ${adherent.nom} à ${event.titre}`);
                toast({ title: "Inscription réussie", description: `${adherent.prenom} ${adherent.nom} est maintenant inscrit.` });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: "L'inscription a échoué." });
        }
    };

    const handleUnregister = async (inscriptionId: string, adherentName: string) => {
        try {
            await deleteInscription(db, inscriptionId);
            if (event) {
                await addLog(db, auth, `Désinscription de ${adherentName} de ${event.titre}`);
                toast({ title: "Désinscription réussie", description: `${adherentName} a été retiré de la liste.` });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: "La désinscription a échoué." });
        }
    };
    
    const handleDeleteEvent = async () => {
        if (!event) return;
        try {
            await deleteEvenement(db, event.id);
            await addLog(db, auth, `Suppression de l'événement : ${event.titre}`);
            toast({ title: "Événement supprimé" });
            router.push('/dashboard/events');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de supprimer l'événement." });
        }
    };

    if (isLoadingEvent) return <EventDetailSkeleton />;
    if (!event) return notFound();
    
    const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{event.titre}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>{formattedDate}</span></div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /><span>{event.lieu}</span></div>
                    <div className="flex items-center gap-1.5"><Euro className="h-4 w-4" /><span className="font-semibold text-foreground">{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span></div>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader className="border-b bg-muted/5"><CardTitle>Description de l'événement</CardTitle></CardHeader>
                    <CardContent className="pt-6"><p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{event.description}</p></CardContent>
                    <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
                        <Button variant="outline" size="sm" asChild aria-label={`Modifier les détails de ${event.titre}`}>
                            <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Modifier</Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" aria-label={`Supprimer l'événement ${event.titre}`}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Supprimer définitivement l'événement ?</AlertDialogTitle><AlertDialogDescription>Cette action supprimera également toutes les inscriptions liées à <strong>{event.titre}</strong>.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    <RegisterMemberDialog 
                        event={event} 
                        adherentsList={nonRegisteredAdherents} 
                        onRegister={handleNewRegistration} 
                        isLoading={isLoadingAdherents || isLoadingInscriptions}
                    />

                    <Card className="shadow-sm">
                        <CardHeader className="border-b bg-muted/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Liste des Inscrits</CardTitle></div>
                                <BadgeCheck className="h-5 w-5 text-green-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 pt-4">
                            {isLoadingInscriptions ? (
                                <div className="space-y-3 p-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                            ) : eventInscriptions.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                                        <span>Adhérent</span>
                                        <span>Paiement / Action</span>
                                    </div>
                                    {eventInscriptions.map((inscription) => {
                                        const adherent = rawAdherents?.find(a => a.id === inscription.id_adherent);
                                        const adherentName = adherent ? `${adherent.prenom} ${adherent.nom}` : "Inconnu";
                                        
                                        return (
                                           <div key={inscription.id} className="group flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                                               <div className="flex items-center justify-between gap-3">
                                                   <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar className="h-9 w-9 border">
                                                            <AvatarImage src={`https://picsum.photos/seed/${inscription.id_adherent}/40/40`} alt={adherentName} data-ai-hint="avatar person" />
                                                            <AvatarFallback className="text-xs bg-primary/5 text-primary font-bold">{adherentName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-semibold truncate">{adherentName}</span>
                                                            <span className="text-[10px] text-muted-foreground">Inscrit le {new Date(inscription.date_inscription).toLocaleDateString()}</span>
                                                        </div>
                                                   </div>
                                                   <div className="flex items-center gap-2 shrink-0">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Switch
                                                                checked={inscription.a_paye}
                                                                onCheckedChange={(checked) => handlePaymentStatusChange(inscription.id, checked)}
                                                                className="scale-75"
                                                                aria-label={`Statut de paiement pour ${adherentName}`}
                                                            />
                                                            <span className={`text-[10px] font-bold ${inscription.a_paye ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {inscription.a_paye ? 'PAYÉ' : 'ATTENTE'}
                                                            </span>
                                                        </div>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" aria-label={`Désinscrire ${adherentName}`}>
                                                                    <UserMinus className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Confirmer la désinscription</AlertDialogTitle><AlertDialogDescription>Voulez-vous vraiment retirer <strong>{adherentName}</strong> de la liste des participants pour cet événement ?</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleUnregister(inscription.id, adherentName)} className="bg-destructive hover:bg-destructive/90">Désinscrire</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                               </div>
                                                {inscription.choixMenu && Object.values(inscription.choixMenu).some(v => v) && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
                                                        {Object.entries(inscription.choixMenu).map(([key, value]) => value && (
                                                            <span key={key} className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase border border-primary/20">
                                                                {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                           </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                 <div className="p-10 text-center border-2 border-dashed rounded-lg">
                                    <p className="text-sm text-muted-foreground italic">Aucun adhérent n'est encore inscrit à cet événement.</p>
                                 </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Minimal BadgeCheck icon replacement if not in lucide
function BadgeCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
