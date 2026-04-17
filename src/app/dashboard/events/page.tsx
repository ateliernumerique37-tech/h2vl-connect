'use client';

import { useState, useMemo, useEffect } from 'react';
import { EventCard } from "@/components/event-card";
import type { Evenement } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

const ITEMS_PER_PAGE = 20;

function EventsPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </div>
                <Skeleton className="h-10 w-44" />
            </div>
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <Skeleton className="h-10 w-full sm:w-64" />
                    <Skeleton className="h-10 w-full sm:w-[180px]" />
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <Skeleton className="aspect-[3/2] w-full" />
                        <CardContent className="p-4">
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default function EventsPage() {
  const db = useFirestore();
  const eventsQuery = useMemoFirebase(() => query(collection(db, 'evenements'), orderBy('date', 'desc')), [db]);
  const { data: allEvents, isLoading } = useCollection<Evenement>(eventsQuery);

  const [period, setPeriod] = useState('upcoming');
  const [selectedYear, setSelectedYear] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Reset to first page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [period, selectedYear]);

  const years = useMemo(() => {
    if (!allEvents) return ['Tous'];
    const eventYears = allEvents.map(e => new Date(e.date).getFullYear());
    const uniqueYears = ['Tous', ...Array.from(new Set(eventYears)).sort((a,b) => b-a).map(String)];
    return uniqueYears;
  }, [allEvents]);

  const hasActiveFilters = period !== 'upcoming' || selectedYear !== 'Tous';

  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    const now = new Date();
    return allEvents
      .filter(event => {
        if (selectedYear !== 'Tous' && new Date(event.date).getFullYear().toString() !== selectedYear) {
          return false;
        }
        const eventDate = new Date(event.date);
        if (period === 'upcoming') {
          return eventDate >= now;
        }
        if (period === 'past') {
          return eventDate < now;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return period === 'upcoming' ? dateA - dateB : dateB - dateA;
      });
  }, [period, selectedYear, allEvents]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);
  
  if (isLoading) {
      return <EventsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
          <p className="text-muted-foreground">
            Découvrez et gérez les événements de l'association en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/events/create" passHref>
            <Button aria-label="Créer un nouvel événement">
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Créer un événement
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <Tabs value={period} onValueChange={setPeriod} className="w-full sm:w-auto">
                <TabsList>
                    <TabsTrigger value="upcoming">Événements à venir</TabsTrigger>
                    <TabsTrigger value="past">Événements passés</TabsTrigger>
                </TabsList>
            </Tabs>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrer par année">
                    <SelectValue placeholder="Filtrer par année" />
                </SelectTrigger>
                <SelectContent>
                    {years.map(year => (
                        <SelectItem key={year} value={year}>
                            {year === 'Tous' ? 'Toutes les années' : year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </CardContent>
      </Card>


      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} trouvé{filteredEvents.length !== 1 ? 's' : ''}
      </div>

       {paginatedEvents.length === 0 ? (
         <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Aucun événement ne correspond à vos critères."
                : "Aucun événement enregistré pour le moment."
              }
            </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>
              <div className="text-sm font-medium">
                Page {currentPage} sur {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
