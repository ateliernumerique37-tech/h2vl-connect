
'use client';

import { useState, useMemo } from 'react';
import type { Adherent, CampagneEmail, EmailTracking } from '@/lib/types';
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
import { Loader2, Search, Send, MailCheck, Filter, Users, BarChart3, ChevronRight, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, setDoc } from 'firebase/firestore';
import { addLog } from '@/services/logsService';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

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

    setIsSending(true);
    setSendProgress(0);

    try {
      const campaignRef = await addDoc(collection(db, 'email_campaigns'), {
        sujet: subject,
        corps: body,
        dateEnvoi: new Date().toISOString(),
        nbDestinataires: selectedIds.size
      });

      const selectedAdherents = adherents?.filter(a => selectedIds.has(a.id)) || [];
      let successCount = 0;

      for (let i = 0; i < selectedAdherents.length; i++) {
        const adherent = selectedAdherents[i];
        
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

        if (res.ok) successCount++;
        setSendProgress(Math.round(((i + 1) / selectedAdherents.length) * 100));
      }

      await addLog(db, auth, `Envoi campagne : ${subject} (${successCount} mails)`);
      toast({ title: 'Campagne terminée', description: `${successCount} e-mails envoyés avec succès.` });
      
      setSubject('');
      setBody('');
      setSelectedIds(new Set());
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur d\'envoi', description: "Une erreur est survenue." });
    } finally {
      setIsSending(false);
    }
  };

  // --- Logique Suivi ---
  const campaignStats = useMemo(() => {
    if (!campaigns || !allTracking) return {};
    
    const stats: Record<string, { confirmed: number, total: number, percentage: number }> = {};
    
    campaigns.forEach(c => {
      const tracking = allTracking.filter(t => t.campagneId === c.id);
      const confirmed = tracking.filter(t => t.statut === 'confirmé').length;
      const total = c.nbDestinataires || tracking.length || 0;
      stats[c.id] = {
        confirmed,
        total,
        percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0
      };
    });
    
    return stats;
  }, [campaigns, allTracking]);

  const selectedCampaignTracking = useMemo(() => {
    if (!selectedCampaignId || !allTracking || !adherents) return [];
    
    return allTracking
      .filter(t => t.campagneId === selectedCampaignId)
      .map(t => {
        const adherent = adherents.find(a => a.id === t.adherentId);
        return {
          ...t,
          adherentName: adherent ? `${adherent.prenom} ${adherent.nom}` : 'Adhérent inconnu'
        };
      })
      .sort((a, b) => a.adherentName.localeCompare(b.adherentName));
  }, [selectedCampaignId, allTracking, adherents]);

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground">Gérez vos envois et analysez l'engagement du bureau.</p>
      </header>

      <Tabs defaultValue="envoi" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="envoi" className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Envoi
          </TabsTrigger>
          <TabsTrigger value="suivi" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Suivi des Campagnes
          </TabsTrigger>
        </TabsList>

        {/* --- ONGLET ENVOI --- */}
        <TabsContent value="envoi" className="space-y-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" /> Ciblage des Adhérents
                </CardTitle>
                <CardDescription>Sélectionnez les membres qui recevront votre message.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher par nom..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={cotisationFilter} onValueChange={setCotisationFilter}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Cotisation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Toutes Cotisations</SelectItem>
                      <SelectItem value="Oui">À jour</SelectItem>
                      <SelectItem value="Non">En retard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous Genres</SelectItem>
                      <SelectItem value="H">Hommes</SelectItem>
                      <SelectItem value="F">Femmes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bureauFilter} onValueChange={setBureauFilter}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous Statuts</SelectItem>
                      <SelectItem value="Bureau">Bureau</SelectItem>
                      <SelectItem value="Bénévole">Bénévoles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedIds.size === filteredAdherents.length && filteredAdherents.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="Tout sélectionner"
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
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">Aucun adhérent trouvé.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selectedIds.size} sélectionné(s) sur {filteredAdherents.length}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >Précédent</Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage * ITEMS_PER_PAGE >= filteredAdherents.length}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >Suivant</Button>
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
                  <Input 
                    id="subject" 
                    placeholder="Ex: Assemblée Générale - Convocation"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Votre message ici..." 
                    className="min-h-[300px]"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Note : Un bouton d'accusé de réception sera automatiquement ajouté en bas du mail.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-6">
                {isSending && (
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Envoi en cours...</span>
                      <span>{sendProgress}%</span>
                    </div>
                    <Progress value={sendProgress} className="h-2" />
                  </div>
                )}
                <Button 
                  className="w-full h-12 text-base" 
                  disabled={isSending || selectedIds.size === 0}
                  onClick={handleSendCampaign}
                >
                  {isSending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  Envoyer aux {selectedIds.size} sélectionnés
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* --- ONGLET SUIVI --- */}
        <TabsContent value="suivi" className="space-y-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Liste des campagnes */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Historique
              </h2>
              {isLoadingCampaigns ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : campaigns && campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map(campaign => {
                    const stats = campaignStats[campaign.id] || { confirmed: 0, total: 0, percentage: 0 };
                    const isSelected = selectedCampaignId === campaign.id;
                    
                    return (
                      <Card 
                        key={campaign.id} 
                        className={cn(
                          "cursor-pointer transition-all hover:border-primary/50",
                          isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : ""
                        )}
                        onClick={() => setSelectedCampaignId(campaign.id)}
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-sm font-bold line-clamp-1">{campaign.sujet}</CardTitle>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(campaign.dateEnvoi).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{stats.confirmed} / {stats.total} confirmés</span>
                            <span className="font-bold text-primary">{stats.percentage}%</span>
                          </div>
                          <Progress value={stats.percentage} className="h-1.5" />
                        </CardContent>
                        <CardFooter className="p-2 border-t flex justify-end">
                           <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-12 text-center text-muted-foreground italic border-dashed">
                  Aucune campagne envoyée pour le moment.
                </Card>
              )}
            </div>

            {/* Détail de la campagne sélectionnée */}
            <div className="lg:col-span-2">
              {selectedCampaignId ? (
                <Card className="h-full">
                  <CardHeader className="border-b bg-muted/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">Détails de la réception</CardTitle>
                        <CardDescription>Liste individuelle des destinataires ciblés.</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCampaignId(null)}>Fermer</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Adhérent</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Date confirmation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCampaignTracking.length > 0 ? (
                          selectedCampaignTracking.map((track) => (
                            <TableRow key={track.jeton}>
                              <TableCell className="font-medium text-sm">{track.adherentName}</TableCell>
                              <TableCell>
                                {track.statut === 'confirmé' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                    <CheckCircle2 className="h-3 w-3" /> Confirmé
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border">
                                    <Clock className="h-3 w-3" /> Envoyé
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {track.dateLecture ? new Date(track.dateLecture).toLocaleString('fr-FR', {
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                }) : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                              Aucune donnée de tracking disponible pour cette campagne.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center bg-muted/5">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">Sélectionnez une campagne</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Cliquez sur une campagne dans la liste de gauche pour voir qui a bien reçu et lu vos messages.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
