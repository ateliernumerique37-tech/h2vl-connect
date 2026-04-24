'use client';

import { useState, useMemo } from 'react';
import type { Adherent, Evenement, Inscription } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

const getAge = (dateString: string): number | null => {
  if (!dateString) return null;
  const birthDate = new Date(dateString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : null;
};

const pct = (n: number, total: number): string =>
  total === 0 ? '0 %' : `${Math.round((n / total) * 100)} %`;

function StatsPageSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-44" />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-5 pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="p-5 pt-0 space-y-2">
              {[...Array(4)].map((__, j) => <Skeleton key={j} className="h-4 w-full" />)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const db = useFirestore();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const adherentsQuery  = useMemoFirebase(() => collection(db, 'adherents'),   [db]);
  const evenementsQuery = useMemoFirebase(() => collection(db, 'evenements'),  [db]);
  const inscriptionsQuery = useMemoFirebase(() => collection(db, 'inscriptions'), [db]);

  const { data: adherents,    isLoading: isLoadingAdherents }    = useCollection<Adherent>(adherentsQuery);
  const { data: evenements,   isLoading: isLoadingEvents }       = useCollection<Evenement>(evenementsQuery);
  const { data: inscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

  const isLoading = isLoadingAdherents || isLoadingEvents || isLoadingInscriptions;

  const years = useMemo(() => {
    if (!evenements) return [currentYear];
    const eventYears = evenements.map(e => new Date(e.date).getFullYear());
    return [...new Set([...eventYears, new Date().getFullYear()])].sort((a, b) => b - a).map(String);
  }, [evenements, currentYear]);

  const stats = useMemo(() => {
    if (!adherents || !evenements || !inscriptions) return null;
    if (adherents.length === 0) return 'EMPTY' as const;

    const yearNum = parseInt(selectedYear);
    const total = adherents.length;

    // ── Membres ────────────────────────────────────────────────────────────────
    const femmes   = adherents.filter(a => a.genre === 'F').length;
    const hommes   = adherents.filter(a => a.genre === 'H').length;
    const autres   = adherents.filter(a => a.genre === 'Autre').length;
    const nonRenseigne = total - femmes - hommes - autres;

    const validAges = adherents
      .map(a => getAge(a.dateNaissance))
      .filter((age): age is number => age !== null);

    const moyenneAge = validAges.length > 0
      ? Math.round(validAges.reduce((s, a) => s + a, 0) / validAges.length)
      : null;

    const ageGroups = [
      { label: 'Moins de 18 ans',  count: validAges.filter(a => a < 18).length },
      { label: '18 – 30 ans',      count: validAges.filter(a => a >= 18 && a <= 30).length },
      { label: '31 – 50 ans',      count: validAges.filter(a => a >= 31 && a <= 50).length },
      { label: '51 – 70 ans',      count: validAges.filter(a => a >= 51 && a <= 70).length },
      { label: 'Plus de 70 ans',   count: validAges.filter(a => a > 70).length },
    ].filter(g => g.count > 0);

    const cotisationsAJour = adherents.filter(a => a.cotisationAJour).length;
    const faaf             = adherents.filter(a => a.estMembreFaaf).length;
    const droitImage       = adherents.filter(a => a.accordeDroitImage).length;
    const bureau           = adherents.filter(a => a.estMembreBureau).length;
    const benevoles        = adherents.filter(a => a.estBenevole && !a.estMembreBureau).length;
    const simples          = total - bureau - benevoles;

    // ── Événements de l'année ──────────────────────────────────────────────────
    const yearEvenements = evenements.filter(e => new Date(e.date).getFullYear() === yearNum);
    const yearInscriptions = inscriptions.filter(i =>
      yearEvenements.some(e => e.id === i.id_evenement)
    );

    const totalInscriptions = yearInscriptions.length;
    const avgInscriptions   = yearEvenements.length > 0
      ? (totalInscriptions / yearEvenements.length).toFixed(1)
      : '0';

    const recettesTotal = yearInscriptions.reduce((sum, i) => {
      const ev = yearEvenements.find(e => e.id === i.id_evenement);
      return sum + (ev?.prix ?? 0);
    }, 0);

    const recettesEncaissees = yearInscriptions
      .filter(i => i.a_paye)
      .reduce((sum, i) => {
        const ev = yearEvenements.find(e => e.id === i.id_evenement);
        return sum + (ev?.prix ?? 0);
      }, 0);

    const inscriptionsPaid  = yearInscriptions.filter(i => i.a_paye).length;
    const tauxPaiement      = totalInscriptions > 0
      ? Math.round((inscriptionsPaid / totalInscriptions) * 100)
      : null;

    // Top événements par nombre d'inscrits
    const topEvenements = yearEvenements
      .map(e => ({
        titre: e.titre,
        count: yearInscriptions.filter(i => i.id_evenement === e.id).length,
        payes: yearInscriptions.filter(i => i.id_evenement === e.id && i.a_paye).length,
        prix:  e.prix,
      }))
      .sort((a, b) => b.count - a.count);

    // ── Participation individuelle ─────────────────────────────────────────────
    const inscriptionsByAdherent = adherents.map(a => ({
      id: a.id,
      count: yearInscriptions.filter(i => i.id_adherent === a.id).length,
    }));

    const participe1Plus  = inscriptionsByAdherent.filter(a => a.count >= 1).length;
    const participe2Plus  = inscriptionsByAdherent.filter(a => a.count >= 2).length;
    const participe3Plus  = inscriptionsByAdherent.filter(a => a.count >= 3).length;

    return {
      total, femmes, hommes, autres, nonRenseigne,
      moyenneAge, validAgesCount: validAges.length,
      ageGroups,
      cotisationsAJour, faaf, droitImage,
      bureau, benevoles, simples,
      yearEvenementsCount: yearEvenements.length,
      totalInscriptions, avgInscriptions,
      recettesTotal, recettesEncaissees,
      inscriptionsPaid, tauxPaiement,
      topEvenements,
      participe1Plus, participe2Plus, participe3Plus,
    };
  }, [adherents, evenements, inscriptions, selectedYear]);

  if (isLoading) return <StatsPageSkeleton />;

  if (stats === 'EMPTY') {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
        <p className="text-xl font-medium text-muted-foreground">Pas assez de données pour générer des statistiques.</p>
        <p className="text-sm text-muted-foreground mt-2">Commencez par ajouter des adhérents à votre association.</p>
      </div>
    );
  }

  if (!stats || typeof stats === 'string') return null;

  const {
    total, femmes, hommes, autres, nonRenseigne,
    moyenneAge, validAgesCount,
    ageGroups,
    cotisationsAJour, faaf, droitImage,
    bureau, benevoles, simples,
    yearEvenementsCount, totalInscriptions, avgInscriptions,
    recettesTotal, recettesEncaissees,
    inscriptionsPaid, tauxPaiement,
    topEvenements,
    participe1Plus, participe2Plus, participe3Plus,
  } = stats;

  const recettesEnAttente = recettesTotal - recettesEncaissees;

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Statistiques</h1>
          <p className="text-muted-foreground">Vue d'ensemble de l'association H2VL.</p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          <Button variant="outline" asChild className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            <Link href="/dashboard/stats/inactifs">
              <AlertCircle className="mr-2 h-4 w-4" />
              Diagnostic Inactivité
            </Link>
          </Button>
          <Select onValueChange={setSelectedYear} defaultValue={selectedYear}>
            <SelectTrigger className="w-full sm:w-[180px] min-h-[40px] focus-visible:ring-2" aria-label="Choisir l'année de référence">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">

        {/* ── Bloc 1 : Vue d'ensemble des membres ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Vue d'ensemble des membres</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              L'association compte <strong className="text-foreground">{total} membre{total > 1 ? 's' : ''}</strong>{' '}
              {femmes > 0 && <>dont <strong className="text-foreground">{femmes} femme{femmes > 1 ? 's' : ''}</strong> ({pct(femmes, total)})</>}
              {femmes > 0 && hommes > 0 && <> et </>}
              {hommes > 0 && <><strong className="text-foreground">{hommes} homme{hommes > 1 ? 's' : ''}</strong> ({pct(hommes, total)})</>}
              {autres > 0 && <>, {autres} autre{autres > 1 ? 's' : ''} ({pct(autres, total)})</>}
              {nonRenseigne > 0 && <>, {nonRenseigne} non renseigné{nonRenseigne > 1 ? 's' : ''}</>}
              .
            </p>

            {moyenneAge !== null ? (
              <p>
                L'âge moyen est de <strong className="text-foreground">{moyenneAge} ans</strong>
                {validAgesCount < total && (
                  <> (calculé sur {validAgesCount} adhérent{validAgesCount > 1 ? 's' : ''} dont la date de naissance est renseignée)</>
                )}
                .
              </p>
            ) : (
              <p>L'âge moyen n'est pas calculable : aucune date de naissance renseignée.</p>
            )}

            <p>
              <strong className="text-foreground">{cotisationsAJour} adhérent{cotisationsAJour > 1 ? 's' : ''}</strong>{' '}
              ({pct(cotisationsAJour, total)}) ont leur cotisation à jour.
              {total - cotisationsAJour > 0 && (
                <> {total - cotisationsAJour} ne sont pas encore à jour pour la période en cours.</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* ── Bloc 2 : Profil de la base ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Profil de la base</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <ul className="space-y-1.5 list-none" role="list">
              <li>
                <strong className="text-foreground">FAAF :</strong>{' '}
                {faaf} adhérent{faaf > 1 ? 's' : ''} ({pct(faaf, total)})
              </li>
              <li>
                <strong className="text-foreground">Droit à l'image accordé :</strong>{' '}
                {droitImage} sur {total} ({pct(droitImage, total)})
              </li>
              <li>
                <strong className="text-foreground">Membres du bureau :</strong> {bureau}
              </li>
              <li>
                <strong className="text-foreground">Bénévoles hors bureau :</strong> {benevoles}
              </li>
              <li>
                <strong className="text-foreground">Adhérents simples :</strong> {simples}
              </li>
            </ul>

            {ageGroups.length > 0 && (
              <div>
                <p className="font-semibold text-foreground mb-1.5">Tranches d'âge</p>
                <ul className="space-y-1 list-none" role="list">
                  {ageGroups.map(g => (
                    <li key={g.label}>
                      <strong className="text-foreground">{g.label} :</strong>{' '}
                      {g.count} ({pct(g.count, validAgesCount)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Bloc 3 : Activité événements ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Activité événements — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4">
            {yearEvenementsCount === 0 ? (
              <p>Aucun événement organisé en {selectedYear}.</p>
            ) : (
              <>
                <p>
                  <strong className="text-foreground">{yearEvenementsCount} événement{yearEvenementsCount > 1 ? 's' : ''}</strong>{' '}
                  organisé{yearEvenementsCount > 1 ? 's' : ''} en {selectedYear}, pour un total de{' '}
                  <strong className="text-foreground">{totalInscriptions} inscription{totalInscriptions > 1 ? 's' : ''}</strong>{' '}
                  ({avgInscriptions} en moyenne par événement).
                </p>

                {recettesTotal > 0 && (
                  <p>
                    Les recettes attendues s'élèvent à <strong className="text-foreground">{recettesTotal.toFixed(2)} €</strong>.{' '}
                    <strong className="text-foreground">{recettesEncaissees.toFixed(2)} €</strong> ont été encaissés
                    {tauxPaiement !== null && <> (taux de paiement : {tauxPaiement} %)</>}
                    {recettesEnAttente > 0 && <>, {recettesEnAttente.toFixed(2)} € restent en attente</>}
                    .
                  </p>
                )}

                {recettesTotal === 0 && (
                  <p>Tous les événements de {selectedYear} étaient gratuits.</p>
                )}

                {topEvenements.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground mb-1.5">Événements par participation</p>
                    <ul className="space-y-1 list-none" role="list">
                      {topEvenements.map((e, i) => (
                        <li key={i}>
                          <strong className="text-foreground">{e.titre} :</strong>{' '}
                          {e.count} inscrit{e.count > 1 ? 's' : ''}
                          {e.prix > 0 && (
                            <> — {e.payes}/{e.count} payé{e.payes > 1 ? 's' : ''}</>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Bloc 4 : Participation individuelle ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Participation individuelle — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-3">
            {yearEvenementsCount === 0 ? (
              <p>Aucune donnée de participation pour {selectedYear}.</p>
            ) : (
              <>
                <p>
                  <strong className="text-foreground">{participe1Plus} membre{participe1Plus > 1 ? 's' : ''}</strong>{' '}
                  ({pct(participe1Plus, total)}) ont participé à au moins un événement en {selectedYear}.
                  {total - participe1Plus > 0 && (
                    <> {total - participe1Plus} n'ont participé à aucun événement sur la période.</>
                  )}
                </p>

                {participe2Plus > 0 && (
                  <p>
                    <strong className="text-foreground">{participe2Plus} membre{participe2Plus > 1 ? 's' : ''}</strong>{' '}
                    ({pct(participe2Plus, total)}) ont participé à au moins deux événements.
                  </p>
                )}

                {participe3Plus > 0 && (
                  <p>
                    <strong className="text-foreground">{participe3Plus} membre{participe3Plus > 1 ? 's' : ''}</strong>{' '}
                    ({pct(participe3Plus, total)}) sont particulièrement actifs avec trois événements ou plus.
                  </p>
                )}

                {participe1Plus === 0 && (
                  <p>Aucun membre n'a participé à un événement en {selectedYear}.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
