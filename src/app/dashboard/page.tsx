'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BadgeCheck, Cake } from 'lucide-react';
import { useMemo } from 'react';
import type { Adherent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

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
                        <Skeleton className="h-8 w-1/4" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium" role="heading" aria-level={2}>Adhérents à jour de cotisation</CardTitle>
                        <BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/4" />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle role="heading" aria-level={2} className="flex items-center gap-2">
                        <Cake className="h-6 w-6 text-primary" aria-hidden="true" />
                        Anniversaires du jour
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function DashboardHomePage() {
    const db = useFirestore();
    const adherentsQuery = useMemoFirebase(() => collection(db, 'adherents'), [db]);
    const { data: adherents, isLoading } = useCollection<Adherent>(adherentsQuery);

    const totalAdherents = adherents?.length || 0;
    const adherentsAJour = adherents?.filter(a => a.cotisationAJour).length || 0;

    const birthdayAdherents = useMemo(() => {
        return (adherents || []).filter(adherent => isBirthdayToday(adherent.dateNaissance));
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
            
            <Card>
                <CardHeader>
                    <CardTitle role="heading" aria-level={2} className="flex items-center gap-2">
                        <Cake className="h-6 w-6 text-primary" aria-hidden="true" />
                        Anniversaires du jour
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {birthdayAdherents.length > 0 ? (
                        <ul className="space-y-2">
                            {birthdayAdherents.map(adherent => (
                                <li key={adherent.id} className="text-base" aria-label={`C'est l'anniversaire de ${adherent.prenom} ${adherent.nom} aujourd'hui.`}>
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
