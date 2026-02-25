'use client';

import { useState, useEffect } from 'react';
import type { Adherent } from "@/lib/types";
import { adherents as mockAdherents } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AdherentCard } from "@/components/adherent-card";
import { Skeleton } from "@/components/ui/skeleton";

function AdherentCardSkeleton() {
  return (
    <div className="p-4 space-y-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    </div>
  );
}

export default function AdherentsPage() {
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setAdherents(mockAdherents);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liste des Adhérents</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre association.
          </p>
        </div>
        <Button 
            aria-label="Ajouter un nouvel adhérent à l'association"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un adhérent
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
             <AdherentCardSkeleton key={i} />
          ))}
        </div>
      ) : adherents.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">Aucun adhérent pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {adherents.map((adherent) => (
            <AdherentCard key={adherent.id} adherent={adherent} />
          ))}
        </div>
      )}
    </div>
  );
}
