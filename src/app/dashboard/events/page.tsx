'use client';

import { useState, useMemo, useEffect } from 'react';
import { EventCard } from "@/components/event-card";
import { getEvenements } from "@/services/evenementsService";
import type { Evenement } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import AiEventForm from '@/components/admin/ai-event-form';


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
  const [allEvents, setAllEvents] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('upcoming');
  const [selectedYear, setSelectedYear] = useState('Tous');
  
  useEffect(() => {
    async function fetchEvents() {
        try {
            const data = await getEvenements();
            setAllEvents(data);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchEvents();
  }, []);
  
  const years = useMemo(() => {
    const eventYears = allEvents.map(e => new Date(e.date).getFullYear());
    const uniqueYears = ['Tous', ...Array.from(new Set(eventYears)).sort((a,b) => b-a).map(String)];
    return uniqueYears;
  }, [allEvents]);

  const hasActiveFilters = period !== 'upcoming' || selectedYear !== 'Tous';

  const filteredEvents = useMemo(() => {
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
  
  if (loading) {
      return <EventsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Événements</h1>
          <p className="text-muted-foreground">
            Découvrez, filtrez et gérez les événements de l'association.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" aria-label="Générer un événement avec l'IA">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer avec l'IA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                 <div className="pt-4">
                  <AiEventForm />
                </div>
              </DialogContent>
            </Dialog>
          <Link href="/dashboard/events/create" passHref>
            <Button
                aria-label="Créer un nouvel événement"
            >
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


       {filteredEvents.length === 0 ? (
         <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Aucun événement ne correspond à vos critères."
                : "Aucun événement enregistré pour le moment."
              }
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
