'use client';

import { useParams, notFound } from 'next/navigation';
import { adherents, evenements, inscriptions } from '@/lib/placeholder-data';
import type { Evenement, Adherent, Inscription } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Euro, Users, PlusCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

function EventDetailSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-full" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/2" />
                </CardContent>
            </Card>

             <div className="flex justify-center">
                 <Skeleton className="h-12 w-48" />
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                     <Skeleton className="mt-2 h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <div className="flex items-center gap-4">
                                     <Skeleton className="h-4 w-24" />
                                     <Skeleton className="h-6 w-11" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


export default function EventDetailPage() {
    const params = useParams();
    const id = params.id as string;
    
    const [event, setEvent] = useState<Evenement | undefined>();
    const [eventInscriptions, setEventInscriptions] = useState<(Inscription & { adherent?: Adherent })[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const foundEvent = evenements.find((e) => e.id === id);
        if (foundEvent) {
            setEvent(foundEvent);
            const foundInscriptions = inscriptions
                .filter(i => i.id_evenement === id)
                .map(inscription => {
                    const adherent = adherents.find(a => a.id === inscription.id_adherent);
                    return { ...inscription, adherent };
                });
            setEventInscriptions(foundInscriptions);
        }
        const timer = setTimeout(() => setLoading(false), 500); // Simulate loading
        return () => clearTimeout(timer);
    }, [id]);

    const handlePaymentStatusChange = (inscriptionId: string, hasPaid: boolean) => {
        setEventInscriptions(prev => 
            prev.map(inscription => 
                inscription.id === inscriptionId ? { ...inscription, a_paye: hasPaid } : inscription
            )
        );
    };

    if (loading) {
        return <EventDetailSkeleton />;
    }

    if (!event) {
        return notFound();
    }
    
    const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">{event.titre}</h1>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Détails de l'événement</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" aria-hidden="true" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                        <span>{event.lieu}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Euro className="h-5 w-5" aria-hidden="true" />
                        <span>{event.prix > 0 ? `${event.prix.toFixed(2)} € par participant` : "Gratuit"}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-center">
                 <Button size="lg" aria-label="Inscrire un nouvel adhérent à cet événement">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Inscrire un adhérent
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" aria-hidden="true" />
                        <CardTitle>Liste des Inscrits ({eventInscriptions.length})</CardTitle>
                    </div>
                    <CardDescription>Gérez les participants et leur statut de paiement.</CardDescription>
                </CardHeader>
                <CardContent>
                    {eventInscriptions.length > 0 ? (
                        <div className="space-y-4">
                            {eventInscriptions.map(({ adherent, id: inscriptionId, a_paye }) => (
                               <div key={inscriptionId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4">
                                   {adherent && (
                                       <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarImage src={`https://picsum.photos/seed/${adherent.id}/40/40`} alt={`Avatar de ${adherent.prenom} ${adherent.nom}`} data-ai-hint="avatar person" />
                                                <AvatarFallback>{`${adherent.prenom?.[0] ?? ''}${adherent.nom?.[0] ?? ''}`.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-medium">{adherent.prenom} {adherent.nom}</p>
                                       </div>
                                   )}
                                   {event.prix > 0 && (
                                    <div className="flex w-full sm:w-auto items-center justify-end gap-4 sm:ml-auto">
                                       <Label htmlFor={`payment-status-${inscriptionId}`} className="text-sm flex-shrink-0">
                                            A payé {event.prix.toFixed(2)} €
                                       </Label>
                                        <Switch
                                            id={`payment-status-${inscriptionId}`}
                                            checked={a_paye}
                                            onCheckedChange={(checked) => handlePaymentStatusChange(inscriptionId, checked)}
                                            aria-label={`Marquer le paiement de ${adherent?.prenom} ${adherent?.nom} comme ${a_paye ? 'non réglé' : 'réglé'}`}
                                        />
                                   </div>
                                   )}
                               </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
                            <p className="text-muted-foreground">Aucun adhérent inscrit pour le moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
