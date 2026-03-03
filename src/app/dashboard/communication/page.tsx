
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Adherent, CampagneEmail, LogEmail } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Send, MailCheck, Filter, Users } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, setDoc } from 'firebase/firestore';
import { addLog } from '@/services/logsService';

const ITEMS_PER_PAGE = 10;

export default function CommunicationPage() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
  const { data: adherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);

  const campaignsQuery = useMemoFirebase(() => query(collection(db, 'email_campaigns'), orderBy('dateEnvoi', 'desc')), [db]);
  const { data: campaigns } = useCollection<CampagneEmail>(campaignsQuery);

  const logsQuery = useMemoFirebase(() => collection(db, 'email_logs'), [db]);
  const { data: allLogs } = useCollection<LogEmail>(logsQuery);

  // Filtres
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

  const stats = useMemo(() => {
    if (!campaigns || !allLogs) return { totalSent: 0, openRate: 0 };
    const totalSent = campaigns.reduce((acc, c) => acc + (c.nbDestinataires || 0), 0);
    const openedCount = allLogs.filter(l => l.ouvert).length;
    const rate = totalSent > 0 ? Math.round((openedCount / totalSent) * 100) : 0;
    return { totalSent, openRate: rate };
  }, [campaigns, allLogs]);

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
      // 1. Créer la campagne
      const campaignRef = await addDoc(collection(db, 'email_campaigns'), {
        sujet: subject,
        corps: body,
        dateEnvoi: new Date().toISOString(),
        nbDestinataires: selectedIds.size
      });

      const selectedAdherents = adherents?.filter(a => selectedIds.has(a.id)) || [];
      let successCount = 0;

      // 2. Envoi individuel
      for (let i = 0; i < selectedAdherents.length; i++) {
        const adherent = selectedAdherents[i];
        
        // Créer un log pour le tracking
        const logRef = doc(collection(db, 'email_logs'));
        await setDoc(logRef, {
          campaignId: campaignRef.id,
          adherentId: adherent.id,
          email: adherent.email,
          ouvert: false,
          dateEnvoi: new Date().toISOString()
        });

        // Appeler l'API d'envoi
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adherent.email,
            firstName: adherent.prenom,
            type: 'campaign',
            campaignSubject: subject,
            campaignBody: body,
            logId: logRef.id
          }),
        });

        if (res.ok) successCount++;
        setSendProgress(Math.round(((i + 1) / selectedAdherents.length) * 100));
      }

      await addLog(db, auth, `Envoi campagne : ${subject} (${successCount} mails)`);
      
      toast({ 
        title: 'Campagne terminée', 
        description: `${successCount} e-mails ont été envoyés avec succès.` 
      });
      
      // Reset
      setSubject('');
      setBody('');
      setSelectedIds(new Set());
      
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur d\'envoi', description: "Une erreur est survenue lors de l'envoi de la campagne." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground">Envoyez des messages ciblés et suivez leur impact.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
              <Send className="h-3 w-3" /> Campagnes envoyées
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Users className="h-3 w-3" /> Total Destinataires
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalSent}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-green-700 flex items-center gap-2">
              <MailCheck className="h-3 w-3" /> Taux d'ouverture moyen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-green-700">{stats.openRate}%</div>
          </CardContent>
        </Card>
      </div>

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
                Note : Un pixel de suivi sera automatiquement ajouté pour mesurer l'ouverture.
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
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${sendProgress}%` }}
                  />
                </div>
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
    </div>
  );
}
