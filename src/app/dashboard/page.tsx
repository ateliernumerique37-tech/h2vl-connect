'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BadgeCheck, Cake } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import type { Adherent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { DashboardTips } from '@/components/dashboard/dashboard-tips';

/**
 * Vérifie si c'est l'anniversaire d'un adhérent aujourd'hui.
 */
const isBirthdayToday = (dateString: string) => {
    if (!dateString) return false;
    try {
        const birthDate = new Date(dateString);
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(2)].map((_, i) => (
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

    // Calcul des statistiques
    const totalAdherents = adherents?.length || 0;
    const adherentsAJour = adherents?.filter(a => a.cotisationAJour).length || 0;

    // Gestion des anniversaires différée pour éviter les erreurs d'hydratation (new Date mismatch)
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
                    Vue d'ensemble de l'activité de votre association.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Total des adhérents</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" aria-label={`Il y a ${totalAdherents} adhérents au total.`}>
                            {totalAdherents}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Adhérents à jour de cotisation</CardTitle>
                        <BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold" aria-label={`${adherentsAJour} adhérents sont à jour de leur cotisation.`}>
                            {adherentsAJour}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Widget intelligent de conseils du jour */}
            <DashboardTips />
            
            <Card>
                <CardHeader>
                    <CardTitle role="heading" aria-level={2} className="flex items-center gap-2">
                        <Cake className="h-6 w-6 text-primary" aria-hidden="true" />
                        Anniversaires du jour
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {birthdayAdherents.length > 0 ? (
                        <ul className="space-y-2" aria-live="polite">
                            {birthdayAdherents.map(adherent => (
                                <li key={adherent.id} className="text-base">
                                    🎂 C'est l'anniversaire de <span className="font-semibold">{adherent.prenom} {adherent.nom}</span> aujourd'hui !
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">Aucun anniversaire aujourd'hui.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
