'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2, UserMinus, Loader2, Search, Check, TrendingUp, Wallet, Coins } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
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

const MENU_ORDER = [
  { key: 'aperitifChoisi', label: 'Apéritif' },
  { key: 'entreeChoisie', label: 'Entrée' },
  { key: 'platChoisi', label: 'Plat principal' },
  { key: 'fromageChoisi', label: 'Fromage' },
  { key: 'dessertChoisi', label: 'Dessert' }
] as const;

function EventDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

const MenuChoiceSection = ({ 
  category, 
  options, 
  selected, 
  onSelect, 
  eventId 
}: { 
  category: string, 
  options: string[], 
  selected: string | undefined, 
  onSelect: (value: string) => void, 
  eventId: string 
}) => {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{category}</Label>
      <RadioGroup onValueChange={onSelect} value={selected} aria-label={`Choix pour ${category}`} className="grid grid-cols-1 gap-1">
        {options.map((option, index) => {
          const optionId = `${category}-${eventId}-${index}`;
          return (
            <div key={optionId} className="flex items-center space-x-2 rounded-md border p-2 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={option} id={optionId} />
              <Label htmlFor={optionId} className="flex-1 cursor-pointer text-sm font-normal">{option}</Label>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
};

function RegisterMemberDialog({ 
  event, 
  adherentsList, 
  onRegister, 
  isLoading,
  currentCount
}: { 
  event: Evenement; 
  adherentsList: Adherent[]; 
  onRegister: (inscription: Omit<Inscription, 'id' | 'date_inscription'>) => Promise<void>; 
  isLoading: boolean;
  currentCount: number;
}) {
  const [selectedAdherentId, setSelectedAdherentId] = useState<string>("");
  const [isPaid, setIsPaid] = useState(false);
  const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const listboxId = "adherents-listbox";
  const inputId = "adherent-search-input";
  const isFull = currentCount >= (event.nombrePlacesMax || Infinity);

  const filteredAdherents = useMemo(() => {
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
      setActiveIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredAdherents.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (activeIndex + 1) % filteredAdherents.length;
      setActiveIndex(nextIndex);
      setSelectedAdherentId(filteredAdherents[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (activeIndex - 1 + filteredAdherents.length) % filteredAdherents.length;
      setActiveIndex(prevIndex);
      setSelectedAdherentId(filteredAdherents[prevIndex].id);
    } else if (e.key === 'Enter' && selectedAdherentId) {
      e.preventDefault();
      handleRegister();
    }
  };

  const handleRegister = async () => {
    if (!selectedAdherentId || isFull) return;
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
        <Button size="lg" disabled={isFull} className="w-full shadow-md min-h-[48px]" aria-label={isFull ? "L'événement est complet" : `Inscrire un adhérent à l'événement ${event.titre}`}>
          <PlusCircle className="mr-2 h-5 w-5" />
          {isFull ? "Événement complet" : "Inscrire un adhérent"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Inscription à l'événement</DialogTitle>
          <DialogDescription>
            Recherchez et sélectionnez un membre pour l'inscrire à <strong>{event.titre}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-2">
          {isFull && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-semibold text-center" role="alert">
              Attention : Cet événement est déjà complet.
            </div>
          )}
          <div className="space-y-3">
            <Label htmlFor={inputId} className="font-semibold">Choix de l'adhérent</Label>
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
                placeholder="Saisissez un nom..."
                className="pl-9 min-h-[44px]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setActiveIndex(-1);
                  setSelectedAdherentId("");
                }}
                onKeyDown={handleKeyDown}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? `adherent-option-${filteredAdherents[activeIndex]?.id}` : undefined}
                autoComplete="off"
              />
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border bg-muted/5">
              <div 
                id={listboxId}
                className="p-1" 
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
                      return (
                        <div
                          key={adherent.id}
                          id={`adherent-option-${adherent.id}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedAdherentId(adherent.id);
                            setActiveIndex(index);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-sm px-3 py-3 text-sm transition-colors cursor-pointer min-h-[44px]",
                            isSelected && "bg-primary text-primary-foreground font-medium",
                            isHighlighted && !isSelected && "bg-muted",
                            !isHighlighted && !isSelected && "hover:bg-muted/50"
                          )}
                        >
                          <span className="truncate">{adherent.prenom} {adherent.nom}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground italic">
                    {adherentsList.length === 0 ? "Tous les membres sont déjà inscrits." : "Aucun membre trouvé."}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="paid-toggle" className="font-semibold cursor-pointer">Paiement reçu</Label>
              <p className="text-xs text-muted-foreground">Cochez si le règlement a été effectué.</p>
            </div>
            <Switch id="paid-toggle" checked={isPaid} onCheckedChange={setIsPaid} aria-label="Marquer comme payé dès l'inscription" />
          </div>

          {event.necessiteMenu && event.optionsMenu && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/5">
              <h4 className="font-bold border-b pb-2 text-sm uppercase">Choix du Menu</h4>
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
            disabled={!selectedAdherentId || isSubmitting || isFull} 
            className="w-full h-12 text-base font-semibold"
            aria-label="Confirmer l'inscription"
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

  const financialStats = useMemo(() => {
    if (!event || !eventInscriptions) return { attendance: 0, expected: 0, perceived: 0, remaining: 0, occupancyRate: 0 };
    
    const attendance = eventInscriptions.length;
    const maxPlaces = event.nombrePlacesMax || 1;
    const occupancyRate = Math.min(Math.round((attendance / maxPlaces) * 100), 100);
    
    const expected = attendance * event.prix;
    const perceived = eventInscriptions.filter(i => i.a_paye).length * event.prix;
    const remaining = expected - perceived;

    return { attendance, expected, perceived, remaining, occupancyRate };
  }, [event, eventInscriptions]);

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
      toast({ title: "Paiement mis à jour" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    }
  };
  
  const handleNewRegistration = async (inscriptionData: Omit<Inscription, 'id' | 'date_inscription'>) => {
    try {
      await addInscription(db, { ...inscriptionData, date_inscription: new Date().toISOString() });
      const adherent = rawAdherents?.find(a => a.id === inscriptionData.id_adherent);
      if (event && adherent) {
        await addLog(db, auth, `Inscription : ${adherent.prenom} ${adherent.nom} à ${event.titre}`);
        toast({ title: "Inscription validée" });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Échec de l'inscription." });
    }
  };

  const handleUnregister = async (inscriptionId: string, adherentName: string) => {
    try {
      await deleteInscription(db, inscriptionId);
      if (event) {
        await addLog(db, auth, `Désinscription : ${adherentName} de ${event.titre}`);
        toast({ title: "Désinscription réussie" });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Échec de la désinscription." });
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
      toast({ variant: 'destructive', title: 'Erreur', description: "Échec de la suppression." });
    }
  };

  if (isLoadingEvent) return <EventDetailSkeleton />;
  if (!event) return notFound();
  
  const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-primary">{event.titre}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="min-h-[40px]">
              <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Modifier</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="min-h-[40px]">
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suppression définitive ?</AlertDialogTitle>
                  <AlertDialogDescription>L'événement et ses {eventInscriptions.length} inscriptions seront effacés.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-2" aria-label={`Date: ${formattedDate}`}>
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2" aria-label={`Lieu: ${event.lieu}`}>
            <MapPin className="h-4 w-4 text-primary" />
            <span>{event.lieu}</span>
          </div>
          <div className="flex items-center gap-2" aria-label={`Prix: ${event.prix.toFixed(2)} €`}>
            <Euro className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-0"><CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Taux de remplissage</CardTitle></CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{financialStats.occupancyRate}%</div>
            <p className="text-[10px] text-muted-foreground">{financialStats.attendance} / {event.nombrePlacesMax || '∞'} places</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-0"><CardTitle className="text-xs font-bold uppercase flex items-center gap-2"><Wallet className="h-3 w-3 text-muted-foreground" /> Recettes attendues</CardTitle></CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{financialStats.expected.toFixed(2)} €</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="p-4 pb-0"><CardTitle className="text-xs font-bold uppercase text-green-700 flex items-center gap-2"><Coins className="h-3 w-3" /> Recettes perçues</CardTitle></CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-green-700">{financialStats.perceived.toFixed(2)} €</div>
          </CardContent>
        </Card>
        <Card className={cn(financialStats.remaining > 0 ? "bg-red-50 border-red-100" : "bg-muted/30")}>
          <CardHeader className="p-4 pb-0"><CardTitle className={cn("text-xs font-bold uppercase", financialStats.remaining > 0 ? "text-red-700" : "text-muted-foreground")}>Reste à percevoir</CardTitle></CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={cn("text-2xl font-bold", financialStats.remaining > 0 ? "text-red-700" : "text-muted-foreground")}>
              {financialStats.remaining.toFixed(2)} €
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-2">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <RegisterMemberDialog 
            event={event} 
            adherentsList={nonRegisteredAdherents} 
            onRegister={handleNewRegistration} 
            isLoading={isLoadingAdherents || isLoadingInscriptions}
            currentCount={eventInscriptions.length}
          />

          <Card className="shadow-sm border-2 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Liste des inscrits ({eventInscriptions.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-3 pt-6">
              {isLoadingInscriptions ? (
                <div className="space-y-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
              ) : eventInscriptions.length > 0 ? (
                <div className="space-y-4">
                  {eventInscriptions.map((inscription) => {
                    const adherent = rawAdherents?.find(a => a.id === inscription.id_adherent);
                    const adherentName = adherent ? `${adherent.prenom} ${adherent.nom}` : "Membre inconnu";
                    
                    return (
                      <div key={inscription.id} className="flex flex-col gap-3 rounded-xl border p-4 hover:border-primary/40 transition-all bg-card shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-sm font-bold truncate block text-foreground">{adherentName}</span>
                            <div className="mt-1">
                              <span className="sr-only">Statut du paiement : </span>
                              {inscription.a_paye ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Payé</Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">En attente</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex flex-col items-center">
                              <Switch
                                checked={inscription.a_paye}
                                onCheckedChange={(checked) => handlePaymentStatusChange(inscription.id, checked)}
                                className="scale-90"
                                aria-label={`Basculer le statut de paiement pour ${adherentName}`}
                              />
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" aria-label={`Retirer ${adherentName}`}>
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Désinscription</AlertDialogTitle>
                                  <AlertDialogDescription>Retirer <strong>{adherentName}</strong> de cet événement ?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleUnregister(inscription.id, adherentName)} className="bg-destructive hover:bg-destructive/90">Confirmer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {inscription.choixMenu && Object.values(inscription.choixMenu).some(v => v) && (
                          <div className="mt-2 space-y-2 border-t pt-3" role="region" aria-label={`Choix de menu pour ${adherentName}`}>
                            {MENU_ORDER.map(menuItem => {
                              const value = inscription.choixMenu?.[menuItem.key as keyof typeof inscription.choixMenu];
                              if (!value) return null;
                              return (
                                <div key={menuItem.key} className="block w-full">
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">
                                    {menuItem.label}
                                  </span>
                                  <div className="text-[11px] text-foreground bg-muted/40 rounded px-2 py-1.5 border-l-2 border-primary/30">
                                    {value}
                                  </div>
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
                <div className="py-12 text-center border-2 border-dashed rounded-xl">
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
