
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

/**
 * Ordre d'affichage imposé pour les choix de menu.
 */
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
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-1/2" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Composant de sélection de menu pour le dialogue d'inscription.
 */
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

/**
 * Dialogue d'inscription d'un membre.
 */
function RegisterMemberDialog({ 
  event, 
  adherentsList, 
  onRegister, 
  isLoading 
}: { 
  event: Evenement; 
  adherentsList: Adherent[]; 
  onRegister: (inscription: Omit<Inscription, 'id' | 'date_inscription'>) => Promise<void>; 
  isLoading: boolean 
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

  const filteredAdherents = useMemo(() => {
    return adherentsList.filter(a => 
      `${a.prenom} ${a.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [adherentsList, searchTerm]);

  // Réinitialisation de l'état à la fermeture/ouverture
  useEffect(() => {
    if (!isOpen) {
      setSelectedAdherentId("");
      setIsPaid(false);
      setMenuChoices({});
      setSearchTerm("");
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // Navigation au clavier pour la liste
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
        <Button size="lg" className="w-full shadow-md" aria-label={`Inscrire un adhérent à l'événement ${event.titre}`}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Inscrire un adhérent
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
          {/* Section Recherche et Liste */}
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
                className="pl-9"
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

          {/* Section Paiement */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="paid-toggle" className="font-semibold cursor-pointer">Paiement reçu</Label>
              <p className="text-xs text-muted-foreground">Cochez si le règlement a été effectué.</p>
            </div>
            <Switch id="paid-toggle" checked={isPaid} onCheckedChange={setIsPaid} aria-label="Marquer comme payé dès l'inscription" />
          </div>

          {/* Section Menu (Conditionnelle) */}
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
            disabled={!selectedAdherentId || isSubmitting} 
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
  
  // Récupération de l'événement
  const eventRef = useMemoFirebase(() => id ? doc(db, 'evenements', id) : null, [db, id]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Evenement>(eventRef);

  // Récupération de tous les adhérents
  const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents')), [db]);
  const { data: rawAdherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);

  // Récupération de toutes les inscriptions
  const inscriptionsQuery = useMemoFirebase(() => query(collection(db, 'inscriptions')), [db]);
  const { data: allInscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

  // Inscriptions filtrées pour cet événement
  const eventInscriptions = useMemo(() => {
    if (!allInscriptions || !id) return [];
    return allInscriptions.filter(ins => ins.id_evenement === id);
  }, [allInscriptions, id]);

  // Adhérents non encore inscrits (pour le dialogue)
  const nonRegisteredAdherents = useMemo(() => {
    if (!rawAdherents) return [];
    const registeredIds = new Set(eventInscriptions.map(ins => ins.id_adherent));
    return rawAdherents
      .filter(adherent => !registeredIds.has(adherent.id))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [rawAdherents, eventInscriptions]);

  // Actions
  const handlePaymentStatusChange = async (inscriptionId: string, hasPaid: boolean) => {
    try {
      await updateInscription(db, inscriptionId, { a_paye: hasPaid });
      toast({ title: "Paiement mis à jour" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Action impossible.' });
    }
  };
  
  const handleNewRegistration = async (inscriptionData: Omit<Inscription, 'id' | 'date_inscription'>) => {
    try {
      await addInscription(db, { ...inscriptionData, date_inscription: new Date().toISOString() });
      const adherent = rawAdherents?.find(a => a.id === inscriptionData.id_adherent);
      if (event && adherent) {
        await addLog(db, auth, `Inscription de ${adherent.prenom} ${adherent.nom} à ${event.titre}`);
        toast({ title: "Inscription validée", description: `${adherent.prenom} est bien inscrit.` });
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
        toast({ title: "Adhérent retiré", description: `${adherentName} a été désinscrit.` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Action impossible." });
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
      toast({ variant: 'destructive', title: 'Erreur', description: "Suppression impossible." });
    }
  };

  if (isLoadingEvent) return <EventDetailSkeleton />;
  if (!event) return notFound();
  
  const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <header className="flex flex-col gap-2 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">{event.titre}</h1>
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

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Colonne Principale: Description & Gestion */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-2">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">Description de l'événement</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-4 border-t bg-muted/10 pt-6">
              <Button variant="outline" size="sm" asChild aria-label={`Modifier ${event.titre}`}>
                <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Modifier l'événement</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" aria-label={`Supprimer ${event.titre}`}>
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'événement
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est définitive pour l'événement <strong>{event.titre}</strong> et toutes les inscriptions liées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Confirmer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="p-4 pb-0"><CardTitle className="text-xs font-bold uppercase text-primary">Inscrits</CardTitle></CardHeader>
              <CardContent className="p-4 pt-1"><div className="text-2xl font-bold">{eventInscriptions.length}</div></CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="p-4 pb-0"><CardTitle className="text-xs font-bold uppercase text-green-700">Payés</CardTitle></CardHeader>
              <CardContent className="p-4 pt-1"><div className="text-2xl font-bold">{eventInscriptions.filter(i => i.a_paye).length}</div></CardContent>
            </Card>
          </div>
        </div>

        {/* Colonne Latérale: Inscriptions */}
        <div className="space-y-6">
          <RegisterMemberDialog 
            event={event} 
            adherentsList={nonRegisteredAdherents} 
            onRegister={handleNewRegistration} 
            isLoading={isLoadingAdherents || isLoadingInscriptions}
          />

          <Card className="shadow-sm border-2 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Liste des inscrits</CardTitle>
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
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 border-2">
                              <AvatarImage src={`https://picsum.photos/seed/${inscription.id_adherent}/40/40`} alt={adherentName} data-ai-hint="avatar person" />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">{adherentName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold truncate text-foreground">{adherentName}</span>
                              <span className="text-[10px] text-muted-foreground">Inscrit le {new Date(inscription.date_inscription).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-center gap-1">
                              <Switch
                                checked={inscription.a_paye}
                                onCheckedChange={(checked) => handlePaymentStatusChange(inscription.id, checked)}
                                className="scale-75"
                                aria-label={`Paiement pour ${adherentName}`}
                              />
                              <span className={cn("text-[9px] font-bold uppercase tracking-tighter", inscription.a_paye ? "text-green-600" : "text-orange-500")}>
                                {inscription.a_paye ? "PAYÉ" : "DÛ"}
                              </span>
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
                                  <AlertDialogAction onClick={() => handleUnregister(inscription.id, adherentName)} className="bg-destructive hover:bg-destructive/90">Désinscrire</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {/* Affichage des choix de menu sur des lignes distinctes et ordonnées */}
                        {inscription.choixMenu && Object.values(inscription.choixMenu).some(v => v) && (
                          <div className="mt-3 space-y-2 border-t pt-3" role="region" aria-label={`Détails du repas pour ${adherentName}`}>
                            {MENU_ORDER.map(menuItem => {
                              const value = inscription.choixMenu?.[menuItem.key as keyof typeof inscription.choixMenu];
                              if (!value) return null;
                              return (
                                <div key={menuItem.key} className="block w-full">
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-0.5">
                                    {menuItem.label}
                                  </span>
                                  <div className="text-[11px] text-foreground bg-muted/40 rounded px-2 py-1 border-l-2 border-primary/30">
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
                  <p className="text-sm text-muted-foreground italic">Aucun inscrit pour cet événement.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
