'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2, UserMinus, Loader2, Search, Check } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteEvenement } from '@/services/evenementsService';
import { addInscription, updateInscription, deleteInscription } from '@/services/inscriptionsService';
import { addLog } from '@/services/logsService';
import { useAuth, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
    const [searchTerm, setSearchTerm] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const listboxId = "adherents-listbox";
    const inputId = "adherent-search-input";

    const filteredAdherents = useMemo(() => {
        if (!adherentsList) return [];
        return adherentsList.filter(a => 
            `${a.prenom} ${a.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [adherentsList, searchTerm]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedAdherentId("");
            setIsPaid(false);
            setMenuChoices({});
            setSearchTerm("");
            setActiveIndex(0);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (filteredAdherents.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % filteredAdherents.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + filteredAdherents.length) % filteredAdherents.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredAdherents[activeIndex]) {
                setSelectedAdherentId(filteredAdherents[activeIndex].id);
            }
        }
    };

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
            <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Inscription à "{event.titre}"</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un membre pour l'inscrire à cet événement. Navigation au clavier (flèches + entrée) supportée.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 overflow-y-auto pr-2">
                    <div className="space-y-3">
                        <Label htmlFor={inputId}>Choisir l'adhérent</Label>
                        <div 
                          className="relative"
                          role="combobox"
                          aria-expanded={isOpen}
                          aria-haspopup="listbox"
                          aria-controls={listboxId}
                        >
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id={inputId}
                                placeholder="Rechercher par nom..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                aria-autocomplete="list"
                                aria-activedescendant={filteredAdherents.length > 0 ? `adherent-option-${filteredAdherents[activeIndex]?.id}` : undefined}
                                autoComplete="off"
                            />
                        </div>
                        
                        <ScrollArea className="h-[200px] rounded-md border bg-muted/5">
                            <div 
                              id={listboxId}
                              className="p-2" 
                              role="listbox" 
                              aria-label="Liste des adhérents disponibles"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement...
                                    </div>
                                ) : filteredAdherents.length > 0 ? (
                                    <div className="space-y-1">
                                        {filteredAdherents.map((adherent, index) => {
                                            const isSelected = selectedAdherentId === adherent.id;
                                            const isHighlighted = activeIndex === index;
                                            const optionId = `adherent-option-${adherent.id}`;
                                            return (
                                                <div
                                                    key={adherent.id}
                                                    id={optionId}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onClick={() => {
                                                        setSelectedAdherentId(adherent.id);
                                                        setActiveIndex(index);
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center justify-between rounded-sm px-3 py-3 text-sm transition-colors cursor-pointer",
                                                        "min-h-[44px]", // WCAG 2.2 Target Size
                                                        isSelected && "bg-primary text-primary-foreground font-medium",
                                                        isHighlighted && !isSelected && "bg-muted outline outline-2 outline-primary",
                                                        isHighlighted && isSelected && "bg-primary/90 outline outline-2 outline-white"
                                                    )}
                                                >
                                                    <span>{adherent.prenom} {adherent.nom}</span>
                                                    {isSelected && <Check className="h-4 w-4" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-sm text-muted-foreground italic">
                                        {adherentsList.length === 0 ? "Tous les adhérents sont déjà inscrits." : "Aucun résultat trouvé."}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                        <Label htmlFor="paid-toggle" className="font-medium cursor-pointer">Paiement reçu ?</Label>
                        <Switch id="paid-toggle" checked={isPaid} onCheckedChange={setIsPaid} aria-label="Marquer comme payé dès l'inscription" />
                    </div>

                    {event.necessiteMenu && event.optionsMenu && (
                        <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
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
                <DialogFooter className="mt-auto pt-4 border-t">
                    <Button 
                      onClick={handleRegister} 
                      disabled={!selectedAdherentId || isSubmitting} 
                      className="w-full"
                      aria-label="Confirmer et valider l'inscription de l'adhérent sélectionné"
                    >
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
    
    const eventRef = useMemoFirebase(() => id ? doc(db, 'evenements', id) : null, [db, id]);
    const { data: event, isLoading: isLoadingEvent } = useDoc<Evenement>(eventRef);

    const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents')), [db]);
    const { data: rawAdherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);

    const inscriptionsQuery = useMemoFirebase(() => query(collection(db, 'inscriptions')), [db]);
    const { data: allInscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

    const eventInscriptions = useMemo(() => {
        if (!allInscriptions || !id) return [];
        return allInscriptions.filter(ins => ins.id_evenement === id);
    }, [allInscriptions, id]);

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
                toast({ title: "Inscription réussie", description: `${adherent.prenom} ${adherent.nom} est inscrit.` });
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
                toast({ title: "Désinscription réussie", description: `${adherentName} a été retiré.` });
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

    const menuDisplayOrder = [
        { key: 'aperitifChoisi', label: 'Apéritif' },
        { key: 'entreeChoisie', label: 'Entrée' },
        { key: 'platChoisi', label: 'Plat principal' },
        { key: 'fromageChoisi', label: 'Fromage' },
        { key: 'dessertChoisi', label: 'Dessert' }
    ];

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
                <Card className="lg:col-span-2 shadow-sm border-2">
                    <CardHeader className="border-b bg-muted/5"><CardTitle>Description</CardTitle></CardHeader>
                    <CardContent className="pt-6"><p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{event.description}</p></CardContent>
                    <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
                        <Button variant="outline" size="sm" asChild aria-label={`Modifier les détails de ${event.titre}`}>
                            <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Modifier l'événement</Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" aria-label={`Supprimer l'événement ${event.titre}`}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle><AlertDialogDescription>Action définitive pour <strong>{event.titre}</strong> et ses inscriptions.</AlertDialogDescription></AlertDialogHeader>
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

                    <Card className="shadow-sm border-2">
                        <CardHeader className="border-b bg-muted/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Inscrits ({eventInscriptions.length})</CardTitle></div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 pt-4">
                            {isLoadingInscriptions ? (
                                <div className="space-y-3 p-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                            ) : eventInscriptions.length > 0 ? (
                                <div className="space-y-2">
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
                                                            <span className="text-[10px] text-muted-foreground">Le {new Date(inscription.date_inscription).toLocaleDateString()}</span>
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
                                                            <span className={`text-[9px] font-bold ${inscription.a_paye ? 'text-green-600' : 'text-orange-600'}`}>
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
                                                                <AlertDialogHeader><AlertDialogTitle>Désinscription</AlertDialogTitle><AlertDialogDescription>Retirer <strong>{adherentName}</strong> de l'événement ?</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleUnregister(inscription.id, adherentName)} className="bg-destructive hover:bg-destructive/90">Retirer</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                               </div>
                                                {inscription.choixMenu && Object.values(inscription.choixMenu).some(v => v) && (
                                                    <div className="mt-2 space-y-1 border-t pt-2">
                                                        {menuDisplayOrder.map(item => {
                                                            const value = inscription.choixMenu?.[item.key as keyof typeof inscription.choixMenu];
                                                            if (!value) return null;
                                                            return (
                                                                <div key={item.key} className="flex items-baseline gap-2 text-[9px]">
                                                                    <span className="font-bold text-primary uppercase w-20 shrink-0">{item.label} :</span>
                                                                    <span className="text-muted-foreground truncate">{value}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                           </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                 <div className="p-10 text-center border-2 border-dashed rounded-lg">
                                    <p className="text-sm text-muted-foreground italic">Aucun inscrit pour le moment.</p>
                                 </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
