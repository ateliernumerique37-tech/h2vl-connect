
'use client';

import { useState, useMemo } from 'react';
import type { Adherent, CampagneEmail, EmailTracking, InvitationEvenement } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Send, MailCheck, Filter, Users, BarChart3, ChevronRight, CheckCircle2, Clock, Calendar, Info } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, addDoc } from 'firebase/firestore';
import { addLog } from '@/services/logsService';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

type TrackingType = 'manual' | 'inscription' | 'birthday' | 'invitation';

export default function CommunicationPage() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  // Données
  const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
  const { data: adherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);

  const campaignsQuery = useMemoFirebase(() => query(collection(db, 'email_campaigns'), orderBy('dateEnvoi', 'desc')), [db]);
  const { data: campaigns, isLoading: isLoadingCampaigns } = useCollection<CampagneEmail>(campaignsQuery);

  const trackingQuery = useMemoFirebase(() => collection(db, 'email_tracking'), [db]);
  const { data: allTracking } = useCollection<EmailTracking>(trackingQuery);

  const invitationsQuery = useMemoFirebase(() => collection(db, 'invitations_evenement'), [db]);
  const { data: allInvitations } = useCollection<InvitationEvenement>(invitationsQuery);

  // Filtres Envoi
  const [searchTerm, setSearchTerm] = useState('');
  const [cotisationFilter, setCotisationFilter] = useState('Tous');
  const [genreFilter, setGenreFilter] = useState('Tous');
  const [bureauFilter, setBureauFilter] = useState('Tous');
  
  // Message
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Sélection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // État Suivi
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [trackingTypeFilter, setTrackingTypeFilter] = useState<TrackingType>('manual');

  // --- Logique Envoi ---
  const filteredAdherents = useMemo(() => {
    if (!adherents) return [];
    return adherents.filter(a => {
      const matchSearch = (a.prenom + ' ' + a.nom).toLowerCase().includes(searchTerm.toLowerCase());
      const matchCotis = cotisationFilter === 'Tous' ? true : (cotisationFilter === 'Oui' ? a.cotisationAJour : !a.cotisationAJour);
      const matchGenre = genreFilter === 'Tous' ? true : a.genre === genreFilter;
      const matchBureau = bureauFilter === 'Tous' ? true : (bureauFilter === 'Bureau' ? a.estMembreBureau : a.estBenevole);
      return matchSearch && matchCotis && matchGenre && matchBureau;
    }).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [adherents, searchTerm, cotisationFilter, genreFilter, bureauFilter]);

  const paginatedAdherents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdherents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdherents, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAdherents.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleSendCampaign = async () => {
    if (selectedIds.size === 0) return;
    if (!subject || !body) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le sujet et le corps du message sont obligatoires.' });
      return;
    }

    if (isLoadingAdherents) {
      toast({ variant: 'destructive', title: 'Attente', description: 'La liste des adhérents n\'est pas encore disponible.' });
      return;
    }

    setIsSending(true);
    setSendProgress(0);

    try {
      const targetAdherents = adherents?.filter(a => selectedIds.has(a.id)) || [];
      
      if (targetAdherents.length === 0) {
        throw new Error("Aucun destinataire valide trouvé pour l'envoi.");
      }

      const campaignRef = await addDoc(collection(db, 'email_campaigns'), {
        sujet: subject,
        corps: body,
        dateEnvoi: new Date().toISOString(),
        nbDestinataires: targetAdherents.length
      });

      let successCount = 0;

      for (let i = 0; i < targetAdherents.length; i++) {
        const adherent = targetAdherents[i];
        
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: adherent.email,
              firstName: adherent.prenom,
              adherentId: adherent.id,
              campaignId: campaignRef.id,
              type: 'campaign',
              campaignSubject: subject,
              campaignBody: body
            }),
          });

          if (res.ok) {
            successCount++;
          }
        } catch (e) {
          console.error(`Echec pour ${adherent.email}:`, e);
        }

        setSendProgress(Math.round(((i + 1) / targetAdherents.length) * 100));
      }

      await addLog(db, auth, `Envoi campagne : ${subject} (${successCount}/${targetAdherents.length} mails réussis)`);
      
      if (successCount > 0) {
        toast({ title: 'Campagne terminée', description: `${successCount} e-mails envoyés.` });
        setSubject('');
        setBody('');
        setSelectedIds(new Set());
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  // --- Logique Suivi ---
  const filteredCampaignList = useMemo(() => {
    if (trackingTypeFilter === 'manual') {
      return campaigns || [];
    }

    if (trackingTypeFilter === 'invitation') {
      if (!allInvitations) return [];
      const groupMap: Record<string, { id: string, sujet: string, dateEnvoi: string, nbDestinataires: number }> = {};
      allInvitations.forEach(inv => {
        if (!groupMap[inv.evenementId]) {
          groupMap[inv.evenementId] = {
            id: inv.evenementId,
            sujet: inv.eventTitle || 'Événement',
            dateEnvoi: inv.dateEnvoi,
            nbDestinataires: 0,
          };
        }
        groupMap[inv.evenementId].nbDestinataires += 1;
        // Conserver la date d'envoi la plus récente pour le groupe
        if (inv.dateEnvoi > groupMap[inv.evenementId].dateEnvoi) {
          groupMap[inv.evenementId].dateEnvoi = inv.dateEnvoi;
        }
      });
      return Object.values(groupMap).sort((a, b) => new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime());
    }

    // Inscriptions et anniversaires : groupés par campagneId depuis email_tracking
    if (!allTracking) return [];
    const groupMap: Record<string, { id: string, sujet: string, dateEnvoi: string, nbDestinataires: number }> = {};
    allTracking.forEach(t => {
      const isMatch = (trackingTypeFilter === 'inscription' && t.campagneId.startsWith('inscription')) ||
                      (trackingTypeFilter === 'birthday' && t.campagneId === 'anniversaire');
      if (isMatch) {
        if (!groupMap[t.campagneId]) {
          groupMap[t.campagneId] = {
            id: t.campagneId,
            sujet: trackingTypeFilter === 'inscription' ? "Confirmation d'inscription" : 'Vœux d\'anniversaire',
            dateEnvoi: t.dateEnvoi,
            nbDestinataires: 0,
          };
        }
        groupMap[t.campagneId].nbDestinataires += 1;
      }
    });
    return Object.values(groupMap).sort((a, b) => new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime());
  }, [campaigns, allTracking, allInvitations, trackingTypeFilter]);

  const campaignStats = useMemo(() => {
    const stats: Record<string, { confirmed: number, total: number, percentage: number }> = {};

    if (trackingTypeFilter === 'invitation') {
      if (!allInvitations) return stats;
      filteredCampaignList.forEach(c => {
        const invs = allInvitations.filter(inv => inv.evenementId === c.id);
        const confirmed = invs.filter(inv => inv.statut === 'inscrit').length;
        const total = invs.length;
        stats[c.id] = { confirmed, total, percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0 };
      });
      return stats;
    }

    if (!allTracking) return stats;
    filteredCampaignList.forEach(c => {
      const tracking = allTracking.filter(t => t.campagneId === c.id);
      const confirmed = tracking.filter(t => t.statut === 'confirmé').length;
      const total = tracking.length || c.nbDestinataires || 0;
      stats[c.id] = { confirmed, total, percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0 };
    });
    return stats;
  }, [filteredCampaignList, allTracking, allInvitations, trackingTypeFilter]);

  const selectedCampaignTracking = useMemo(() => {
    if (!selectedCampaignId || !allTracking || !adherents) return [];
    return allTracking
      .filter(t => t.campagneId === selectedCampaignId)
      .map(t => {
        const adherent = adherents.find(a => a.id === t.adherentId);
        return { ...t, adherentName: adherent ? `${adherent.prenom} ${adherent.nom}` : 'Adhérent inconnu' };
      })
      .sort((a, b) => a.adherentName.localeCompare(b.adherentName));
  }, [selectedCampaignId, allTracking, adherents]);

  const selectedInvitationTracking = useMemo(() => {
    if (!selectedCampaignId || !allInvitations || !adherents) return [];
    return allInvitations
      .filter(inv => inv.evenementId === selectedCampaignId)
      .map(inv => {
        const adherent = adherents.find(a => a.id === inv.adherentId);
        return { ...inv, adherentName: adherent ? `${adherent.prenom} ${adherent.nom}` : 'Adhérent inconnu' };
      })
      .sort((a, b) => a.adherentName.localeCompare(b.adherentName));
  }, [selectedCampaignId, allInvitations, adherents]);

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground">Gérez vos envois et analysez l'engagement.</p>
      </header>

      <Tabs defaultValue="envoi" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="envoi" className="flex items-center gap-2"><Send className="h-4 w-4" aria-hidden="true" /> Envoi</TabsTrigger>
          <TabsTrigger value="suivi" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" aria-hidden="true" /> Suivi</TabsTrigger>
        </TabsList>

        <TabsContent value="envoi" className="space-y-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Ciblage</CardTitle>
                <CardDescription>Sélectionnez les membres qui recevront votre message.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative" role="search">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="adherent-search"
                    aria-label="Rechercher un adhérent par nom"
                    placeholder="Rechercher..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={cotisationFilter} onValueChange={setCotisationFilter}>
                    <SelectTrigger className="text-xs h-9" aria-label="Filtrer par statut de cotisation"><SelectValue placeholder="Cotisation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Toutes Cotisations</SelectItem>
                      <SelectItem value="Oui">À jour</SelectItem>
                      <SelectItem value="Non">En retard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="text-xs h-9" aria-label="Filtrer par genre"><SelectValue placeholder="Genre" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous Genres</SelectItem>
                      <SelectItem value="H">Hommes</SelectItem>
                      <SelectItem value="F">Femmes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bureauFilter} onValueChange={setBureauFilter}>
                    <SelectTrigger className="text-xs h-9" aria-label="Filtrer par statut bureau ou bénévole"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous Statuts</SelectItem>
                      <SelectItem value="Bureau">Bureau</SelectItem>
                      <SelectItem value="Bénévole">Bénévoles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === filteredAdherents.length && filteredAdherents.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="Sélectionner tous les adhérents filtrés"
                          />
                        </TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAdherents ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : paginatedAdherents.length > 0 ? (
                        paginatedAdherents.map(a => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(a.id)}
                                onCheckedChange={() => toggleSelection(a.id)}
                                aria-label={`Sélectionner ${a.prenom} ${a.nom}`}
                              />
                            </TableCell>
                            <TableCell className="text-sm font-medium">{a.prenom} {a.nom}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{a.email}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">Aucun adhérent.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{selectedIds.size} sélectionné(s)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Précédent</Button>
                    <Button variant="outline" size="sm" disabled={currentPage * ITEMS_PER_PAGE >= filteredAdherents.length} onClick={() => setCurrentPage(p => p + 1)}>Suivant</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rédiger le message</CardTitle>
                <CardDescription>Préparez votre communication groupée.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Objet du mail</Label>
                  <Input id="subject" placeholder="Ex: Assemblée Générale" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Votre message ici..." className="min-h-[300px]" value={body} onChange={(e) => setBody(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <Info className="h-3 w-3" /> Un bouton d'accusé de réception sera ajouté en bas du mail.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-6">
                <div aria-live="polite" aria-atomic="true" className="w-full">
                  {isSending && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Envoi en cours…</span>
                        <span aria-label={`${sendProgress} pourcent`}>{sendProgress}%</span>
                      </div>
                      <Progress
                        value={sendProgress}
                        className="h-2"
                        aria-label="Progression de l'envoi de la campagne"
                        aria-valuenow={sendProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  )}
                </div>
                <Button className="w-full h-12 text-base" disabled={isSending || selectedIds.size === 0 || isLoadingAdherents} onClick={handleSendCampaign}>
                  {isSending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  Envoyer aux {selectedIds.size} sélectionnés
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suivi" className="space-y-6">
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Label id="tracking-type-label" className="font-bold">Type de suivi :</Label>
                <Select value={trackingTypeFilter} onValueChange={(v) => { setTrackingTypeFilter(v as TrackingType); setSelectedCampaignId(null); }}>
                  <SelectTrigger className="w-full sm:w-[250px]" aria-labelledby="tracking-type-label">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Campagnes Manuelles</SelectItem>
                    <SelectItem value="invitation">Invitations Événements</SelectItem>
                    <SelectItem value="inscription">Confirmations d'inscription</SelectItem>
                    <SelectItem value="birthday">Anniversaires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Historique</h2>
              {isLoadingCampaigns ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredCampaignList.length > 0 ? (
                <div className="space-y-3">
                  {filteredCampaignList.map(campaign => {
                    const stats = campaignStats[campaign.id] || { confirmed: 0, total: 0, percentage: 0 };
                    const isSelected = selectedCampaignId === campaign.id;
                    const statLabel = trackingTypeFilter === 'invitation' ? 'inscrits' : 'confirmés';
                    return (
                      <Card
                        key={campaign.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`${campaign.sujet}, ${stats.confirmed} sur ${stats.total} ${statLabel}, ${stats.percentage}%`}
                        className={cn("cursor-pointer transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "")}
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCampaignId(campaign.id); } }}
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-sm font-bold line-clamp-1">{campaign.sujet}</CardTitle>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap" aria-hidden="true">{new Date(campaign.dateEnvoi).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="flex justify-between text-xs mb-1" aria-hidden="true">
                            <span className="text-muted-foreground">{stats.confirmed} / {stats.total} {statLabel}</span>
                            <span className="font-bold text-primary">{stats.percentage}%</span>
                          </div>
                          <Progress
                            value={stats.percentage}
                            className="h-1.5"
                            aria-hidden="true"
                          />
                        </CardContent>
                        <CardFooter className="p-2 border-t flex justify-end"><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-12 text-center text-muted-foreground italic border-dashed">Aucun historique trouvé pour ce type.</Card>
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedCampaignId ? (
                <Card className="h-full">
                  <CardHeader className="border-b bg-muted/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">
                          {trackingTypeFilter === 'invitation' ? "Détails des invitations" : "Détails de réception"}
                        </CardTitle>
                        <CardDescription>
                          {filteredCampaignList.find(c => c.id === selectedCampaignId)?.sujet}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCampaignId(null)}>Fermer</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {trackingTypeFilter === 'invitation' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Adhérent</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Date d'inscription</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvitationTracking.length > 0 ? (
                            selectedInvitationTracking.map((inv) => (
                              <TableRow key={`${inv.evenementId}-${inv.adherentId}`}>
                                <TableCell className="font-medium text-sm">{inv.adherentName}</TableCell>
                                <TableCell>
                                  {inv.statut === 'inscrit' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Inscrit</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border"><Clock className="h-3 w-3" aria-hidden="true" /> Invitation envoyée</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {inv.dateInscription ? new Date(inv.dateInscription).toLocaleString('fr-FR') : '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Aucune donnée.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Adhérent</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Confirmation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCampaignTracking.length > 0 ? (
                            selectedCampaignTracking.map((track) => (
                              <TableRow key={track.jeton}>
                                <TableCell className="font-medium text-sm">{track.adherentName}</TableCell>
                                <TableCell>
                                  {track.statut === 'confirmé' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Confirmé</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border"><Clock className="h-3 w-3" aria-hidden="true" /> Envoyé</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {track.dateLecture ? new Date(track.dateLecture).toLocaleString('fr-FR') : '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Aucune donnée.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center bg-muted/5">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">Sélectionnez un historique</h3>
                  <p className="text-sm text-muted-foreground mt-1">Cliquez sur un élément dans la liste de gauche pour voir les détails de confirmation.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
