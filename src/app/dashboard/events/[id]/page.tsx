'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Evenement, Adherent, Inscription, MoyenPaiementInscription } from '@/lib/types';
import { MOYENS_PAIEMENT_INSCRIPTION, MOYEN_PAIEMENT_LABEL } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Euro, Users, PlusCircle, Pencil, Trash2, UserMinus, Loader2, Search, Check, TrendingUp, Wallet, Coins, X, Download, Mail, ChevronLeft } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteEvenement } from '@/services/evenementsService';
import { addInscription, updateInscription, deleteInscription } from '@/services/inscriptionsService';
import { addLog } from '@/services/logsService';
import { useAuth, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, setDoc } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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
  const [moyenPaiementDialog, setMoyenPaiementDialog] = useState<MoyenPaiementInscription>('especes');
  const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
  const [bowlingChoices, setBowlingChoices] = useState<Inscription['choixBowling']>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxRef = useRef<HTMLDivElement>(null);
  
  const listboxId = `adherents-listbox-${event.id}`;
  const inputId = `adherent-search-input-${event.id}`;
  const isFull = currentCount >= (event.nombrePlacesMax || Infinity);
  const now = new Date();
  const isEventPast = new Date(event.date) < now;
  const isDeadlinePassed = event.dateLimiteInscription
    ? new Date(event.dateLimiteInscription) < now
    : false;
  const isRegistrationClosed = isEventPast || isDeadlinePassed;

  const filteredAdherents = useMemo(() => {
    return adherentsList.filter(a => 
      `${a.prenom} ${a.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [adherentsList, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAdherentId("");
      setIsPaid(false);
      setMoyenPaiementDialog('especes');
      setMenuChoices({});
      setBowlingChoices({});
      setSearchTerm("");
      setActiveIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.querySelector(`[id="adherent-option-${filteredAdherents[activeIndex]?.id}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, filteredAdherents]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredAdherents.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredAdherents.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredAdherents.length) % filteredAdherents.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          setSelectedAdherentId(filteredAdherents[activeIndex].id);
          setSearchTerm(`${filteredAdherents[activeIndex].prenom} ${filteredAdherents[activeIndex].nom}`);
        }
        break;
      case 'Escape':
        setActiveIndex(-1);
        break;
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
        ...(isPaid && { moyenPaiement: moyenPaiementDialog }),
        ...(event.necessiteMenu && { choixMenu: menuChoices }),
        ...(event.estSortieBowling && { choixBowling: bowlingChoices }),
      };
      await onRegister(newInscription);
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSelection = () => {
    setSelectedAdherentId("");
    setSearchTerm("");
    setActiveIndex(-1);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          disabled={isFull || isRegistrationClosed}
          className="w-full shadow-md min-h-[48px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={
            isFull ? "L'événement est complet"
            : isEventPast ? "L'événement est passé"
            : isDeadlinePassed ? "La date limite d'inscription est dépassée"
            : `Inscrire un adhérent à l'événement ${event.titre}`
          }
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          {isFull ? "Événement complet"
            : isEventPast ? "Événement passé"
            : isDeadlinePassed ? "Inscriptions fermées"
            : "Inscrire un adhérent"}
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
          <div className="sr-only" aria-live="polite">
            {searchTerm && `${filteredAdherents.length} adhérent(s) trouvé(s). Utilisez les flèches haut et bas pour naviguer.`}
          </div>

          {isFull && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-semibold text-center" role="alert">
              Attention : Cet événement est déjà complet.
            </div>
          )}
          {!isFull && isEventPast && (
            <div className="p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-md text-sm font-semibold text-center" role="alert">
              Cet événement est passé — les inscriptions sont fermées.
            </div>
          )}
          {!isFull && !isEventPast && isDeadlinePassed && (
            <div className="p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-md text-sm font-semibold text-center" role="alert">
              La date limite d'inscription est dépassée.
            </div>
          )}
          
          <div className="space-y-3">
            <Label htmlFor={inputId} className="font-semibold">Choix de l'adhérent</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id={inputId}
                placeholder="Rechercher par nom ou prénom..."
                className="pl-9 pr-9 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setActiveIndex(-1);
                  if (selectedAdherentId) setSelectedAdherentId("");
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-activedescendant={activeIndex >= 0 ? `adherent-option-${filteredAdherents[activeIndex]?.id}` : undefined}
                aria-label="Rechercher et sélectionner un adhérent"
                autoComplete="off"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground" 
                  onClick={clearSelection}
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border bg-muted/5 shadow-inner">
              <div 
                id={listboxId}
                ref={listboxRef}
                className="p-1" 
                role="listbox" 
                aria-label="Résultats de recherche des adhérents"
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
                            setSearchTerm(`${adherent.prenom} ${adherent.nom}`);
                            setActiveIndex(index);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-sm px-3 py-3 text-sm transition-colors cursor-pointer min-h-[44px]",
                            isSelected && "bg-primary text-primary-foreground font-medium",
                            isHighlighted && !isSelected && "bg-accent text-accent-foreground",
                            !isHighlighted && !isSelected && "hover:bg-muted/50"
                          )}
                        >
                          <span className="truncate">{adherent.prenom} {adherent.nom}</span>
                          {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground italic">
                    {adherentsList.length === 0 ? "Tous les membres sont déjà inscrits." : "Aucun membre trouvé pour cette recherche."}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <Label htmlFor="paid-toggle" className="font-semibold cursor-pointer">Paiement reçu</Label>
                <p className="text-xs text-muted-foreground">Cochez si le règlement a été effectué.</p>
              </div>
              <Switch id="paid-toggle" checked={isPaid} onCheckedChange={setIsPaid} aria-label="Marquer comme payé dès l'inscription" />
            </div>
            {isPaid && (
              <div className="border-t px-4 pb-4 pt-3 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Moyen de paiement</Label>
                <RadioGroup value={moyenPaiementDialog} onValueChange={(v) => setMoyenPaiementDialog(v as MoyenPaiementInscription)} className="grid grid-cols-2 gap-2 pt-1">
                  {MOYENS_PAIEMENT_INSCRIPTION.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-2 rounded-md border bg-background p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                      <RadioGroupItem value={value} id={`reg-moyen-${value}`} />
                      <Label htmlFor={`reg-moyen-${value}`} className="cursor-pointer text-sm font-normal">{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>

          {event.necessiteMenu && event.optionsMenu && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/5">
              <h3 className="font-bold border-b pb-2 text-sm uppercase text-primary/80">Choix du Menu</h3>
              <div className="grid gap-4">
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
            </div>
          )}

          {event.estSortieBowling && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/5">
              <h3 className="font-bold border-b pb-2 text-sm uppercase text-primary/80">🎳 Options Bowling</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`bowling-barrieres-${event.id}`}
                    checked={bowlingChoices?.avecBarrieres ?? false}
                    onCheckedChange={(checked) => setBowlingChoices(prev => ({ ...prev, avecBarrieres: checked === true, sansBarrieres: checked === true ? false : prev?.sansBarrieres }))}
                    aria-label="Joue avec barrières"
                  />
                  <Label htmlFor={`bowling-barrieres-${event.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                    Avec barrières
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`bowling-sans-barrieres-${event.id}`}
                    checked={bowlingChoices?.sansBarrieres ?? false}
                    onCheckedChange={(checked) => setBowlingChoices(prev => ({ ...prev, sansBarrieres: checked === true, avecBarrieres: checked === true ? false : prev?.avecBarrieres }))}
                    aria-label="Joue sans barrières"
                  />
                  <Label htmlFor={`bowling-sans-barrieres-${event.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                    Sans barrières
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`bowling-gouter-${event.id}`}
                    checked={bowlingChoices?.prendGouter ?? false}
                    onCheckedChange={(checked) => setBowlingChoices(prev => ({ ...prev, prendGouter: checked === true }))}
                    aria-label="Prend le goûter de l'amitié"
                  />
                  <Label htmlFor={`bowling-gouter-${event.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                    Prend le goûter de l'amitié
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button 
            onClick={handleRegister}
            disabled={!selectedAdherentId || isSubmitting || isFull || isRegistrationClosed}
            className="w-full h-12 text-base font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Confirmer l'inscription"
            aria-busy={isSubmitting}
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
  const { data: event, isLoading: isLoadingEvent, error: eventError } = useDoc<Evenement>(eventRef);

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

  const filteredNonRegistered = useMemo(() => {
    const q = inviteeSearch.toLowerCase().trim();
    if (!q) return nonRegisteredAdherents;
    return nonRegisteredAdherents.filter(a =>
      a.nom.toLowerCase().includes(q) || a.prenom.toLowerCase().includes(q)
    );
  }, [nonRegisteredAdherents, inviteeSearch]);

  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [invitationProgress, setInvitationProgress] = useState(0);
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [inviteeSearch, setInviteeSearch] = useState('');
  const [pendingPayInscriptionId, setPendingPayInscriptionId] = useState<string | null>(null);
  const [selectedMoyenInscription, setSelectedMoyenInscription] = useState<MoyenPaiementInscription>('especes');

  const handleSendInvitations = async () => {
    if (!event || selectedInvitees.size === 0) return;
    setIsSendingInvitations(true);
    setInvitationProgress(0);

    const targets = nonRegisteredAdherents.filter(a => selectedInvitees.has(a.id));
    const formattedEventDate = new Date(event.date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    let successCount = 0;
    for (let i = 0; i < targets.length; i++) {
      const adherent = targets[i];
      if (!adherent.email) {
        setInvitationProgress(Math.round(((i + 1) / targets.length) * 100));
        continue;
      }
      try {
        const res = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adherent.email,
            firstName: adherent.prenom,
            adherentId: adherent.id,
            eventId: event.id,
            eventTitle: event.titre,
            eventDate: formattedEventDate,
            eventDateFin: event.dateFin
              ? new Date(event.dateFin).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : undefined,
            eventLocation: event.lieu,
            eventPrix: event.prix,
          }),
        });
        if (res.ok) successCount++;
      } catch (e) {
        console.error(`Echec invitation ${adherent.email}:`, e);
      }
      setInvitationProgress(Math.round(((i + 1) / targets.length) * 100));
    }

    await addLog(db, auth, `Invitations envoyées pour "${event.titre}" (${successCount}/${targets.length})`);
    toast({ title: 'Invitations envoyées', description: `${successCount} invitation(s) envoyée(s).` });
    setIsSendingInvitations(false);
    setSelectedInvitees(new Set());
  };

  const handlePaymentStatusChange = async (inscriptionId: string, hasPaid: boolean) => {
    if (hasPaid) {
      // Ouvrir le dialog pour choisir le moyen de paiement
      setSelectedMoyenInscription('especes');
      setPendingPayInscriptionId(inscriptionId);
      return;
    }
    try {
      await updateInscription(db, inscriptionId, { a_paye: false });
      toast({ title: "Paiement annulé" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayInscriptionId) return;
    try {
      await updateInscription(db, pendingPayInscriptionId, { a_paye: true, moyenPaiement: selectedMoyenInscription });
      toast({ title: "Paiement enregistré", description: MOYEN_PAIEMENT_LABEL[selectedMoyenInscription] });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    } finally {
      setPendingPayInscriptionId(null);
    }
  };
  
  const handleNewRegistration = async (inscriptionData: Omit<Inscription, 'id' | 'date_inscription'>) => {
    try {
      const inscriptionDate = new Date().toISOString();
      const inscriptionId = await addInscription(db, { ...inscriptionData, date_inscription: inscriptionDate });

      // Générer et stocker le jeton d'annulation
      const jetonAnnulation = crypto.randomUUID();
      await setDoc(doc(db, 'annulations_inscription', jetonAnnulation), {
        inscriptionId,
        evenementId: event?.id || '',
        eventTitle: event?.titre || '',
        eventDate: formattedDate,
        eventDateFin: formattedDateFin || null,
        utilisé: false,
        createdAt: inscriptionDate,
      });

      const adherent = rawAdherents?.find(a => a.id === inscriptionData.id_adherent);

      if (event && adherent) {
        await addLog(db, auth, `Inscription : ${adherent.prenom} ${adherent.nom} à ${event.titre}`);

        // Envoi de l'email de confirmation via l'API Nodemailer avec tracking
        try {
          const formattedEventDate = new Date(event.date).toLocaleDateString("fr-FR", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          const annulationUrl = `${window.location.origin}/lien/annulation/${jetonAnnulation}`;

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: adherent.email,
              firstName: adherent.prenom,
              adherentId: adherent.id,
              campaignId: `inscription_${event.id}`,
              subject: `Confirmation d'inscription : ${event.titre}`,
              eventTitle: event.titre,
              eventDate: formattedEventDate,
              eventDateFin: event.dateFin
                ? new Date(event.dateFin).toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : undefined,
              eventLocation: event.lieu,
              menuChoices: inscriptionData.choixMenu ?? null,
              bowlingChoices: inscriptionData.choixBowling ?? null,
              annulationUrl,
            }),
          });
          toast({ title: "Inscription validée et email envoyé" });
        } catch (emailError) {
          console.error("Échec envoi email:", emailError);
          toast({ title: "Inscription validée", description: "Note: L'envoi de l'email a échoué." });
        }
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

  const handleExportCSV = () => {
    if (!event || !eventInscriptions.length || !rawAdherents) return;

    const hasBowling = event.estSortieBowling;
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Statut Paiement", "Moyen de paiement", "Montant réglé (€)", "Prix unitaire (€)", "Choix Menu", ...(hasBowling ? ["Options Bowling"] : [])];

    const rows = eventInscriptions.map(ins => {
      const ad = rawAdherents.find(a => a.id === ins.id_adherent);

      const menuChoicesStr = ins.choixMenu
        ? MENU_ORDER.map(menuItem => {
            const value = ins.choixMenu?.[menuItem.key as keyof typeof ins.choixMenu];
            return value ? `${menuItem.label}: ${value}` : null;
          })
          .filter(Boolean)
          .join(' | ')
        : '';

      const bowlingStr = ins.choixBowling
        ? [
            ins.choixBowling.avecBarrieres ? 'Avec barrières' : null,
            ins.choixBowling.sansBarrieres ? 'Sans barrières' : null,
            ins.choixBowling.prendGouter ? "Goûter de l'amitié" : null,
          ].filter(Boolean).join(' | ')
        : '';

      return [
        ad?.prenom || '',
        ad?.nom || '',
        ad?.email || '',
        ad?.telephone || '',
        ins.a_paye ? "Payé" : "En attente",
        ins.moyenPaiement ? MOYEN_PAIEMENT_LABEL[ins.moyenPaiement] : '',
        ins.a_paye ? event.prix.toFixed(2) : "0.00",
        event.prix.toFixed(2),
        menuChoicesStr,
        ...(hasBowling ? [bowlingStr] : []),
      ];
    });

    const csvString = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inscrits_${event.titre.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export CSV prêt", description: "Le fichier a été téléchargé." });
  };

  if (eventError) {
    return (
      <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <p className="font-bold">Une erreur technique est survenue lors du chargement de l'événement.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  if (isLoadingEvent) return <EventDetailSkeleton />;
  if (!event) return notFound();
  
  const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const formattedDateFin = event.dateFin
    ? new Date(event.dateFin).toLocaleDateString("fr-FR", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : null;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard/events" aria-label="Retour à la liste des événements">
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Retour aux événements
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-primary">{event.titre}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="min-h-[40px] focus-visible:ring-2 focus-visible:ring-primary">
              <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Modifier</Link>
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
                  <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive">Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-2" aria-label={`Début: ${formattedDate}`}>
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formattedDate}</span>
          </div>
          {formattedDateFin && (
            <div className="flex items-center gap-2" aria-label={`Fin: ${formattedDateFin}`}>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fin : {formattedDateFin}</span>
            </div>
          )}
          <div className="flex items-center gap-2" aria-label={`Lieu: ${event.lieu}`}>
            <MapPin className="h-4 w-4 text-primary" />
            <span>{event.lieu}</span>
          </div>
          <div className="flex items-center gap-2" aria-label={`Prix: ${event.prix.toFixed(2)} €`}>
            <Euro className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span>
          </div>
          {event.dateLimiteInscription && (
            <div
              className={`flex items-center gap-2 ${isDeadlinePassed ? 'text-destructive font-semibold' : ''}`}
              aria-label={`Date limite d'inscription : ${new Date(event.dateLimiteInscription).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            >
              <Calendar className="h-4 w-4 text-primary" />
              <span>
                Limite d'inscription : {new Date(event.dateLimiteInscription).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {isDeadlinePassed && <span className="ml-1">(dépassée)</span>}
              </span>
            </div>
          )}
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

          <Card className="shadow-sm border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                Invitations par e-mail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nonRegisteredAdherents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Tous les adhérents sont déjà inscrits.
                </p>
              ) : (
                <>
                  {/* Barre de recherche + tout sélectionner */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        placeholder="Rechercher un adhérent…"
                        value={inviteeSearch}
                        onChange={e => setInviteeSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                        aria-label="Rechercher un adhérent à inviter"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 text-xs"
                      onClick={() => {
                        const allIds = new Set(filteredNonRegistered.map(a => a.id));
                        const allSelected = filteredNonRegistered.every(a => selectedInvitees.has(a.id));
                        if (allSelected) {
                          setSelectedInvitees(prev => {
                            const next = new Set(prev);
                            filteredNonRegistered.forEach(a => next.delete(a.id));
                            return next;
                          });
                        } else {
                          setSelectedInvitees(prev => new Set([...prev, ...allIds]));
                        }
                      }}
                      aria-label={filteredNonRegistered.every(a => selectedInvitees.has(a.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    >
                      {filteredNonRegistered.every(a => selectedInvitees.has(a.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Button>
                  </div>

                  {/* Liste des adhérents avec cases à cocher */}
                  <ScrollArea className="h-48 rounded-md border">
                    <div className="p-2 space-y-1">
                      {filteredNonRegistered.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat.</p>
                      ) : (
                        filteredNonRegistered.map(adherent => (
                          <div
                            key={adherent.id}
                            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedInvitees(prev => {
                              const next = new Set(prev);
                              next.has(adherent.id) ? next.delete(adherent.id) : next.add(adherent.id);
                              return next;
                            })}
                          >
                            <Checkbox
                              checked={selectedInvitees.has(adherent.id)}
                              onCheckedChange={() => setSelectedInvitees(prev => {
                                const next = new Set(prev);
                                next.has(adherent.id) ? next.delete(adherent.id) : next.add(adherent.id);
                                return next;
                              })}
                              aria-label={`Sélectionner ${adherent.prenom} ${adherent.nom}`}
                              onClick={e => e.stopPropagation()}
                            />
                            <span className="text-sm flex-1">{adherent.prenom} {adherent.nom}</span>
                            {!adherent.email && (
                              <span className="text-[10px] text-muted-foreground italic">sans email</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Progression */}
                  <div aria-live="polite" aria-atomic="true">
                    {isSendingInvitations && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Envoi en cours…</span>
                          <span aria-label={`${invitationProgress} pourcent`}>{invitationProgress}%</span>
                        </div>
                        <Progress
                          value={invitationProgress}
                          className="h-2"
                          aria-label="Progression de l'envoi des invitations"
                          aria-valuenow={invitationProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bouton d'envoi */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full min-h-[40px] focus-visible:ring-2 focus-visible:ring-primary"
                        variant="outline"
                        disabled={isSendingInvitations || selectedInvitees.size === 0 || isLoadingAdherents || isLoadingInscriptions}
                        aria-label={`Envoyer les invitations aux ${selectedInvitees.size} adhérent(s) sélectionné(s)`}
                      >
                        {isSendingInvitations
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Envoi…</>
                          : <><Mail className="mr-2 h-4 w-4" aria-hidden="true" /> Envoyer {selectedInvitees.size > 0 ? `(${selectedInvitees.size})` : ''}</>
                        }
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Envoyer les invitations ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {selectedInvitees.size} adhérent{selectedInvitees.size > 1 ? 's' : ''} recevront un e-mail avec un lien personnel pour confirmer leur inscription à <strong>{event.titre}</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSendInvitations} className="focus-visible:ring-2 focus-visible:ring-primary">
                          Confirmer l'envoi
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Liste des inscrits ({eventInscriptions.length})</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportCSV} 
                  disabled={eventInscriptions.length === 0}
                  className="min-h-[40px] focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Exporter la liste des inscrits au format CSV"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exporter (CSV)
                </Button>
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
                            <div className="mt-1 space-y-1">
                              <span className="sr-only">Statut du paiement : </span>
                              {inscription.a_paye ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Payé</Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">En attente</Badge>
                              )}
                              {inscription.a_paye && inscription.moyenPaiement && (
                                <p className="text-[10px] text-muted-foreground">{MOYEN_PAIEMENT_LABEL[inscription.moyenPaiement]}</p>
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

                        {inscription.choixBowling && Object.values(inscription.choixBowling).some(v => v) && (
                          <div className="mt-2 border-t pt-3" role="region" aria-label={`Options bowling pour ${adherentName}`}>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">🎳 Bowling</span>
                            <div className="flex flex-wrap gap-2">
                              {inscription.choixBowling.avecBarrieres && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">Avec barrières</span>
                              )}
                              {inscription.choixBowling.sansBarrieres && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">Sans barrières</span>
                              )}
                              {inscription.choixBowling.prendGouter && (
                                <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1">Goûter de l'amitié</span>
                              )}
                            </div>
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

      {/* Dialog moyen de paiement inscription */}
      <Dialog open={pendingPayInscriptionId !== null} onOpenChange={(open) => { if (!open) setPendingPayInscriptionId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moyen de paiement</DialogTitle>
            <DialogDescription>
              Par quel moyen le règlement a-t-il été effectué ?
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedMoyenInscription} onValueChange={(v) => setSelectedMoyenInscription(v as MoyenPaiementInscription)} className="space-y-2 py-2">
            {MOYENS_PAIEMENT_INSCRIPTION.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <RadioGroupItem value={value} id={`pay-moyen-${value}`} />
                <Label htmlFor={`pay-moyen-${value}`} className="cursor-pointer font-normal">{label}</Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPayInscriptionId(null)}>Annuler</Button>
            <Button onClick={handleConfirmPayment}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
