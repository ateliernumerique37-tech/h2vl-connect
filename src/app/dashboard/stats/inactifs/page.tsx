'use client';

import { useMemo } from 'react';
import type { Adherent, Inscription, EmailTracking } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { AlertCircle, UserSearch, CalendarX, MailX, ChevronLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function InactiveMembersPage() {
  const db = useFirestore();

  // Chargement des données nécessaires au diagnostic
  const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
  const inscriptionsQuery = useMemoFirebase(() => collection(db, 'inscriptions'), [db]);
  const emailLogsQuery = useMemoFirebase(() => collection(db, 'email_tracking'), [db]);

  const { data: adherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);
  const { data: inscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);
  const { data: emailLogs, isLoading: isLoadingLogs } = useCollection<EmailTracking>(emailLogsQuery);

  const isLoading = isLoadingAdherents || isLoadingInscriptions || isLoadingLogs;

  const diagnostic = useMemo(() => {
    if (!adherents || !inscriptions || !emailLogs) return null;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return adherents.map(adherent => {
      // 1. Trouver la dernière inscription
      const memberInscriptions = inscriptions.filter(i => i.id_adherent === adherent.id);
      const lastInscriptionDate = memberInscriptions.length > 0 
        ? new Date(Math.max(...memberInscriptions.map(i => new Date(i.date_inscription).getTime())))
        : null;

      // 2. Trouver la dernière confirmation de lecture d'email
      const memberLogs = emailLogs.filter(l => l.adherentId === adherent.id && l.statut === 'confirmé');
      const lastEmailOpenDate = memberLogs.length > 0
        ? new Date(Math.max(...memberLogs.map(l => new Date(l.dateLecture!).getTime())))
        : null;

      // Détermination de l'inactivité (si les deux sont < 6 mois ou inexistants)
      const hasRecentInscription = lastInscriptionDate && lastInscriptionDate > sixMonthsAgo;
      const hasRecentEmailOpen = lastEmailOpenDate && lastEmailOpenDate > sixMonthsAgo;

      const isInactive = !hasRecentInscription && !hasRecentEmailOpen;

      // Calcul du dernier contact global
      let lastContact = "Aucun contact enregistré";
      if (lastInscriptionDate && lastEmailOpenDate) {
        lastContact = lastInscriptionDate > lastEmailOpenDate
          ? `Dernière inscription : ${lastInscriptionDate.toLocaleDateString('fr-FR')}`
          : `Dernier e-mail confirmé : ${lastEmailOpenDate.toLocaleDateString('fr-FR')}`;
      } else if (lastInscriptionDate) {
        lastContact = `Dernière inscription : ${lastInscriptionDate.toLocaleDateString('fr-FR')}`;
      } else if (lastEmailOpenDate) {
        lastContact = `Dernier e-mail confirmé : ${lastEmailOpenDate.toLocaleDateString('fr-FR')}`;
      }

      return {
        ...adherent,
        isInactive,
        lastContact
      };
    }).filter(a => a.isInactive)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [adherents, inscriptions, emailLogs]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const inactiveCount = diagnostic?.length || 0;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href="/dashboard/stats"><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Diagnostic d'Inactivité</h1>
          </div>
          <p className="text-muted-foreground">Membres n'ayant eu aucune interaction depuis plus de 6 mois.</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Analyse du risque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{inactiveCount} membres</div>
            <p className="text-xs text-red-600/80 mt-1">N'ont plus donné de nouvelles depuis 6 mois.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2 text-muted-foreground">
              <CalendarX className="h-4 w-4" /> Critère 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">Zéro participation physique</div>
            <p className="text-xs text-muted-foreground mt-1">Aucune inscription aux événements.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2 text-muted-foreground">
              <MailX className="h-4 w-4" /> Critère 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">Zéro lecture d'e-mails</div>
            <p className="text-xs text-muted-foreground mt-1">Aucun e-mail ouvert (tracking).</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserSearch className="h-5 w-5 text-primary" />
            Liste des membres à relancer
          </CardTitle>
          <CardDescription>
            Une relance téléphonique ou un e-mail personnalisé est conseillé pour ces membres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adhérent</TableHead>
                  <TableHead>Dernier contact connu</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnostic && diagnostic.length > 0 ? (
                  diagnostic.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-bold py-4">
                        {member.prenom} {member.nom}
                        <span className="block text-xs font-normal text-muted-foreground">{member.email}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.lastContact}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="focus-visible:ring-2">
                          <Link href={`/dashboard/adherents/${member.id}`}>
                            Voir la fiche <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                      Excellente nouvelle ! Aucun membre n'est considéré comme inactif actuellement.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
