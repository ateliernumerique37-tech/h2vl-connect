'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BadgeCheck, Cake, Heart, UserPlus, Milestone } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import type { Adherent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { DashboardTips } from '@/components/dashboard/dashboard-tips';

/**
 * Calcule l'âge exact à partir d'une chaîne de date ISO.
 */
const calculateAge = (dateString: string): number | null => {
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
 * Vérifie si c'est l'anniversaire d'un adhérent aujourd'hui.
 */
const isBirthdayToday = (dateString: string) => {
    if (!dateString) return false;
    try {
        const birthDate = new Date(dateString);
        if (isNaN(birthDate.getTime())) return false;
        const today = new Date();
        return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
    } catch (e) {
        return false;
    }
};

function DashboardSkeleton() {
    return (
        <div className="space-y-6" aria-hidden="true">
            <header>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </header>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function DashboardHomePage() {
    const db = useFirestore();
    const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
    const { data: adherents, isLoading } = useCollection<Adherent>(adherentsQuery);

    const [birthdayAdherents, setBirthdayAdherents] = useState<Adherent[]>([]);

    // Calcul des statistiques avec useMemo pour la performance et la robustesse
    const stats = useMemo(() => {
        if (!adherents) return {
            total: 0,
            aJour: 0,
            tauxCotisation: 0,
            benevoles: 0,
            moyenneAge: 'N/A'
        };

        const total = adherents.length;
        const aJour = adherents.filter(a => a.cotisationAJour).length;
        const tauxCotisation = total > 0 ? Math.round((aJour / total) * 100) : 0;
        const benevoles = adherents.filter(a => a.estBenevole).length;

        // Calcul de la moyenne d'âge
        const validAges = adherents
            .map(a => calculateAge(a.dateNaissance))
            .filter((age): age is number => age !== null);
        
        const moyenneAge = validAges.length > 0 
            ? Math.round(validAges.reduce((sum, age) => sum + age, 0) / validAges.length)
            : 'N/A';

        return {
            total,
            aJour,
            tauxCotisation,
            benevoles,
            moyenneAge
        };
    }, [adherents]);

    // Gestion des anniversaires différée pour éviter les erreurs d'hydratation
    useEffect(() => {
        if (adherents) {
            const todayBirthdays = adherents.filter(adherent => isBirthdayToday(adherent.dateNaissance));
            setBirthdayAdherents(todayBirthdays);
        }
    }, [adherents]);
    
    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Tableau de Bord</h1>
                <p className="text-muted-foreground">
                    Vue d'ensemble de l'activité de votre association basée sur {stats.total} adhérents.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Total Adhérents</CardTitle>
                        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" aria-label={`Il y a ${stats.total} adhérents au total.`}>
                            {stats.total}
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Cotisations à jour</CardTitle>
                        <BadgeCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold" aria-label={`${stats.tauxCotisation}% des adhérents sont à jour de leur cotisation.`}>
                            {stats.tauxCotisation}% <span className="text-xs font-normal text-muted-foreground">({stats.aJour})</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Bénévoles Actifs</CardTitle>
                        <Heart className="h-4 w-4 text-red-500" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" aria-label={`Il y a ${stats.benevoles} bénévoles actifs.`}>
                            {stats.benevoles}
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Moyenne d'âge</CardTitle>
                        <Milestone className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" aria-label={`La moyenne d'âge des adhérents est de ${stats.moyenneAge} ans.`}>
                            {stats.moyenneAge} {stats.moyenneAge !== 'N/A' && <span className="text-sm font-normal text-muted-foreground">ans</span>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DashboardTips />
            
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle role="heading" aria-level={2} className="flex items-center gap-2">
                        <Cake className="h-6 w-6 text-primary" aria-hidden="true" />
                        Anniversaires du jour
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {birthdayAdherents.length > 0 ? (
                        <ul className="space-y-3" aria-live="polite">
                            {birthdayAdherents.map(adherent => (
                                <li key={adherent.id} className="text-base flex items-center gap-2">
                                    <span className="text-xl">🎂</span>
                                    <span>C'est l'anniversaire de <span className="font-bold">{adherent.prenom} {adherent.nom}</span> aujourd'hui !</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground italic">Aucun anniversaire aujourd'hui.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
