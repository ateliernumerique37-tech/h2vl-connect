'use client';

import { useState, useMemo } from 'react';
import type { Adherent, Evenement, Inscription } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--muted-foreground))'];

/**
 * Calcule l'âge à partir d'une date ISO.
 */
const getAge = (dateString: string) => {
  if (!dateString) return null;
  const birthDate = new Date(dateString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Squelette de chargement pour la page statistiques.
 */
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent className="p-4 pt-0"><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const db = useFirestore();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
  const evenementsQuery = useMemoFirebase(() => collection(db, 'evenements'), [db]);
  const inscriptionsQuery = useMemoFirebase(() => collection(db, 'inscriptions'), [db]);

  const { data: adherents, isLoading: isLoadingAdherents } = useCollection<Adherent>(adherentsQuery);
  const { data: evenements, isLoading: isLoadingEvents } = useCollection<Evenement>(evenementsQuery);
  const { data: inscriptions, isLoading: isLoadingInscriptions } = useCollection<Inscription>(inscriptionsQuery);

  const isLoading = isLoadingAdherents || isLoadingEvents || isLoadingInscriptions;

  const years = useMemo(() => {
    if (!evenements) return [currentYear];
    const eventYears = evenements.map(e => new Date(e.date).getFullYear());
    const allYears = [...eventYears, new Date().getFullYear()];
    return [...new Set(allYears)].sort((a, b) => b - a).map(String);
  }, [evenements, currentYear]);

  /**
   * Nettoyage et agrégation des données.
   */
  const stats = useMemo(() => {
    if (!adherents || !evenements || !inscriptions) return null;
    if (adherents.length === 0) return 'EMPTY';

    const yearNum = parseInt(selectedYear);
    const yearEvenements = evenements.filter(e => new Date(e.date).getFullYear() === yearNum);
    
    // 1. Répartition par genre (gestion des vides)
    const genreCounts = adherents.reduce((acc, a) => {
      const g = a.genre || 'Non renseigné';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const genderChartData = [
      { name: 'Hommes', value: genreCounts['H'] || 0 },
      { name: 'Femmes', value: genreCounts['F'] || 0 },
      { name: 'Autre', value: genreCounts['Autre'] || 0 },
      { name: 'Non renseigné', value: genreCounts['Non renseigné'] || 0 },
    ].filter(d => d.value > 0);

    // 2. Pyramide des âges
    const validAges = adherents
      .map(a => getAge(a.dateNaissance))
      .filter((age): age is number => age !== null && age >= 0);

    const ageGroups = [
      { name: '0-18', value: validAges.filter(a => a < 18).length },
      { name: '18-30', value: validAges.filter(a => a >= 18 && a <= 30).length },
      { name: '31-50', value: validAges.filter(a => a >= 31 && a <= 50).length },
      { name: '51-70', value: validAges.filter(a => a >= 51 && a <= 70).length },
      { name: '70+', value: validAges.filter(a => a > 70).length },
    ].filter(g => g.value > 0);

    const moyenneAge = validAges.length > 0 
      ? Math.round(validAges.reduce((sum, a) => sum + a, 0) / validAges.length) 
      : 'N/A';

    // 3. Engagement
    const bureau = adherents.filter(a => a.estMembreBureau).length;
    const benevoles = adherents.filter(a => a.estBenevole && !a.estMembreBureau).length;
    const simples = adherents.filter(a => !a.estBenevole && !a.estMembreBureau).length;

    const engagementChartData = [
      { name: 'Bureau', value: bureau },
      { name: 'Bénévoles', value: benevoles },
      { name: 'Adhérents simples', value: simples },
    ];

    // 4. Inscriptions aux événements de l'année
    const totalInscriptions = inscriptions.filter(i => yearEvenements.some(e => e.id === i.id_evenement)).length;
    const avgInscriptions = yearEvenements.length > 0 ? (totalInscriptions / yearEvenements.length).toFixed(1) : '0';

    return {
      genderChartData,
      ageGroups,
      moyenneAge,
      engagementChartData,
      totalAdherents: adherents.length,
      totalEvenements: yearEvenements.length,
      avgInscriptions,
      cotisationsAJour: adherents.filter(a => a.cotisationAJour).length,
      validAgesCount: validAges.length
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Analyse Statistique</h1>
          <p className="text-muted-foreground">Données consolidées basées sur l'intégralité des 13 champs adhérents.</p>
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase text-primary">Total Adhérents</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{stats.totalAdherents}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase">Âge Moyen</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{stats.moyenneAge} ans</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase text-green-600">Cotisations à jour</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.cotisationsAJour}</div>
            <p className="text-[10px] text-muted-foreground uppercase">{Math.round((stats.cotisationsAJour / stats.totalAdherents) * 100)}% de la base</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase text-accent-foreground">Événements ({selectedYear})</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalEvenements}</div>
            <p className="text-[10px] text-muted-foreground uppercase">Moy. {stats.avgInscriptions} inscrits</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Genre</CardTitle>
            <CardDescription>Données issues des profils complétés.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.genderChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {stats.genderChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="sr-only">
              <table>
                <caption>Répartition par Genre</caption>
                <thead><tr><th>Genre</th><th>Nombre</th></tr></thead>
                <tbody>
                  {stats.genderChartData.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.value}</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Associatif</CardTitle>
            <CardDescription>Structure hiérarchique et bénévolat.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.engagementChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Nombre de membres" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="sr-only">
              <table>
                <caption>Engagement Associatif</caption>
                <thead><tr><th>Rôle</th><th>Nombre</th></tr></thead>
                <tbody>
                  {stats.engagementChartData.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.value}</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pyramide des Âges</CardTitle>
            <CardDescription>Distribution des adhérents par tranches d'âge (Calcul basé sur {stats.validAgesCount} dates valides).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageGroups} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" name="Adhérents" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="sr-only">
              <table>
                <caption>Distribution par tranches d'âge</caption>
                <thead><tr><th>Tranche d'âge</th><th>Nombre</th></tr></thead>
                <tbody>
                  {stats.ageGroups.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.value}</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
