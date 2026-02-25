'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Adherent, Evenement, Inscription } from '@/lib/types';
import { getAdherents } from '@/services/adherentsService';
import { getEvenements } from '@/services/evenementsService';
import { getInscriptions } from '@/services/inscriptionsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';

const getAge = (dateString: string) => {
  if (!dateString) return 0;
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

function StatsPageSkeleton() {
    return (
         <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Statistiques de l'Association</h1>
                    <p className="text-muted-foreground">Analyse des données clés de l'association.</p>
                </div>
                <div className="w-full sm:w-auto">
                    <Skeleton className="h-10 w-[180px]" />
                </div>
            </header>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map(i => <Card key={i}><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>)}
            </div>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Répartition par genre</CardTitle></CardHeader>
                    <CardContent><div className="h-[250px] w-full flex items-center justify-center"><Skeleton className="h-40 w-40 rounded-full" /></div></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Bilan des événements</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><Skeleton className="h-4 w-1/2 mb-2" /><Skeleton className="h-8 w-1/4" /></div>
                        <div><Skeleton className="h-4 w-1/2 mb-2" /><Skeleton className="h-8 w-1/4" /></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


export default function StatsPage() {
    const [loading, setLoading] = useState(true);
    const [adherents, setAdherents] = useState<Adherent[]>([]);
    const [evenements, setEvenements] = useState<Evenement[]>([]);
    const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
    const db = useFirestore();
    
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    useEffect(() => {
        if (!db) return;
        async function fetchData() {
            try {
                const [adherentsData, evenementsData, inscriptionsData] = await Promise.all([
                    getAdherents(db),
                    getEvenements(db),
                    getInscriptions(db)
                ]);
                setAdherents(adherentsData);
                setEvenements(evenementsData);
                setInscriptions(inscriptionsData);
            } catch (error) {
                console.error("Failed to fetch stats data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [db]);

    const years = useMemo(() => {
        const eventYears = evenements.map(e => new Date(e.date).getFullYear());
        const memberYears = adherents.map(a => new Date(a.dateInscription).getFullYear());
        const allYears = [...eventYears, ...memberYears, new Date().getFullYear()];
        return [...new Set(allYears)].sort((a,b) => b-a).map(String);
    }, [adherents, evenements]);

    const filteredData = useMemo(() => {
        const yearNum = parseInt(selectedYear);

        const yearAdherents = adherents.filter(a => new Date(a.dateInscription).getFullYear() <= yearNum);
        const yearEvenements = evenements.filter(e => new Date(e.date).getFullYear() === yearNum);
        
        const genderData = yearAdherents.reduce((acc, adherent) => {
            acc[adherent.genre] = (acc[adherent.genre] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const genderChartData = [
            { name: 'Hommes', value: genderData['H'] || 0 },
            { name: 'Femmes', value: genderData['F'] || 0 },
            { name: 'Autre', value: genderData['Autre'] || 0 },
        ].filter(d => d.value > 0);
        
        const totalAge = yearAdherents.reduce((acc, a) => acc + getAge(a.dateNaissance), 0);
        const averageAge = yearAdherents.length > 0 ? Math.round(totalAge / yearAdherents.length) : 0;
        
        const benevoles = yearAdherents.filter(a => a.estBenevole).length;
        const faaf = yearAdherents.filter(a => a.estMembreFaaf).length;
        const bureau = yearAdherents.filter(a => a.estMembreBureau).length;
        const droitImage = yearAdherents.filter(a => a.accordeDroitImage).length;
        
        const totalInscriptions = inscriptions.filter(i => yearEvenements.some(e => e.id === i.id_evenement)).length;
        const averageInscriptions = yearEvenements.length > 0 ? Math.round(totalInscriptions / yearEvenements.length) : 0;

        return {
            genderChartData,
            averageAge,
            benevoles,
            faaf,
            bureau,
            droitImage,
            totalEvenements: yearEvenements.length,
            averageInscriptions,
        };

    }, [selectedYear, adherents, evenements, inscriptions]);

    if (loading) {
        return <StatsPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Statistiques de l'Association</h1>
                    <p className="text-muted-foreground">Analyse des données clés de l'association pour l'année {selectedYear}.</p>
                </div>
                <div className="w-full sm:w-auto">
                    <Select onValueChange={setSelectedYear} defaultValue={selectedYear}>
                        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Sélectionner une année pour filtrer les statistiques">
                            <SelectValue placeholder="Sélectionner une année" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>Moyenne d'âge</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold" aria-label={`La moyenne d'âge de l'association est de ${filteredData.averageAge} ans.`}>{filteredData.averageAge} ans</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>Engagement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p aria-label={`${filteredData.benevoles} bénévoles.`}><strong>Bénévoles :</strong> {filteredData.benevoles}</p>
                        <p aria-label={`${filteredData.faaf} membres FAAF.`}><strong>Membres FAAF :</strong> {filteredData.faaf}</p>
                        <p aria-label={`${filteredData.bureau} membres du bureau.`}><strong>Membres du Bureau :</strong> {filteredData.bureau}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>Droit à l'image</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <p className="text-3xl font-bold" aria-label={`${filteredData.droitImage} personnes ont accordé leur droit à l'image.`}>{filteredData.droitImage}</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>Répartition par genre</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full" aria-label={`Graphique de répartition par genre: ${filteredData.genderChartData.map(d => `${d.value} ${d.name}`).join(', ')}.`}>
                           <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={filteredData.genderChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                         {filteredData.genderChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [value, name]} />
                                    <Legend />
                                </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="sr-only" aria-hidden="true">
                           <p>Détail de la répartition par genre :</p>
                           <ul>
                            {filteredData.genderChartData.length > 0 ? (
                                filteredData.genderChartData.map(d => <li key={d.name}>{d.name}: {d.value}</li>)
                            ) : (
                                <li>Aucune donnée de genre disponible.</li>
                            )}
                           </ul>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>Bilan des événements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div aria-label={`${filteredData.totalEvenements} événements organisés pour l'année ${selectedYear}.`}>
                            <p className="text-sm text-muted-foreground">Nombre total d'événements</p>
                            <p className="text-2xl font-bold">{filteredData.totalEvenements}</p>
                        </div>
                         <div aria-label={`Moyenne de ${filteredData.averageInscriptions} inscriptions par événement.`}>
                            <p className="text-sm text-muted-foreground">Moyenne d'inscriptions par événement</p>
                            <p className="text-2xl font-bold">{filteredData.averageInscriptions}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
