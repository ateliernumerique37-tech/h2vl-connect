'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Adherent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AdherentCard } from "@/components/adherent-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

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

function AdherentsPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-80" />
                </div>
                <Skeleton className="h-10 w-44" />
            </div>
            <Card>
                <CardHeader><CardTitle><Skeleton className="h-6 w-48" /></CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                </CardContent>
            </Card>
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader className="flex flex-row items-center gap-4 p-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="grid gap-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-40" /></div>
                    </CardHeader></Card>
                ))}
            </div>
        </div>
    )
}

export default function AdherentsPage() {
  const db = useFirestore();
  const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents'), orderBy('nom'), orderBy('prenom')), [db]);
  const { data: adherents, isLoading } = useCollection<Adherent>(adherentsQuery);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('Tous');
  const [cotisationFilter, setCotisationFilter] = useState('Tous');
  const [benevoleFilter, setBenevoleFilter] = useState('Tous');
  const [faafFilter, setFaafFilter] = useState('Tous');
  const [bureauFilter, setBureauFilter] = useState('Tous');
  const [droitImageFilter, setDroitImageFilter] = useState('Tous');
  const [ageFilter, setAgeFilter] = useState('Tous');

  const hasActiveFilters = searchTerm || genreFilter !== 'Tous' || cotisationFilter !== 'Tous' || benevoleFilter !== 'Tous' || faafFilter !== 'Tous' || bureauFilter !== 'Tous' || droitImageFilter !== 'Tous' || ageFilter !== 'Tous';

  const filteredAdherents = useMemo(() => {
    if (!adherents) return [];
    return adherents
      .filter(adherent => {
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) return true;
        return (
          adherent.prenom.toLowerCase().includes(searchLower) ||
          adherent.nom.toLowerCase().includes(searchLower) ||
          adherent.email.toLowerCase().includes(searchLower) ||
          adherent.telephone?.toLowerCase().includes(searchLower) ||
          adherent.adresse?.toLowerCase().includes(searchLower)
        );
      })
      .filter(adherent => genreFilter === 'Tous' ? true : adherent.genre === genreFilter)
      .filter(adherent => {
        if (cotisationFilter === 'Tous') return true;
        const hasPaid = adherent.cotisationAJour;
        return (cotisationFilter === 'À jour') ? hasPaid : !hasPaid;
      })
      .filter(adherent => {
        if (benevoleFilter === 'Tous') return true;
        const isBenevole = adherent.estBenevole;
        return (benevoleFilter === 'Oui') ? isBenevole : !isBenevole;
      })
      .filter(adherent => {
        if (faafFilter === 'Tous') return true;
        const isFaaf = adherent.estMembreFaaf;
        return (faafFilter === 'Oui') ? isFaaf : !isFaaf;
      })
      .filter(adherent => {
        if (bureauFilter === 'Tous') return true;
        const isBureau = adherent.estMembreBureau;
        return (bureauFilter === 'Oui') ? isBureau : !isBureau;
      })
      .filter(adherent => {
        if (droitImageFilter === 'Tous') return true;
        const hasDroit = adherent.accordeDroitImage;
        return (droitImageFilter === 'Accordé') ? hasDroit : !hasDroit;
      })
      .filter(adherent => {
        if (ageFilter === 'Tous') return true;
        const age = getAge(adherent.dateNaissance);
        switch (ageFilter) {
          case '-18': return age < 18;
          case '18-30': return age >= 18 && age <= 30;
          case '31-50': return age >= 31 && age <= 50;
          case '50+': return age > 50;
          default: return true;
        }
      });
  }, [adherents, searchTerm, genreFilter, cotisationFilter, benevoleFilter, faafFilter, bureauFilter, droitImageFilter, ageFilter]);
  
  if (isLoading) {
      return <AdherentsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liste des Adhérents</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre association en temps réel.
          </p>
        </div>
        <Button asChild>
            <Link href="/dashboard/adherents/create" aria-label="Ajouter un nouvel adhérent à l'association">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un adhérent
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Filtres et Recherche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="search-adherent">Rechercher</Label>
                <Input
                    id="search-adherent"
                    type="search"
                    role="search"
                    placeholder="Rechercher par nom, email, téléphone ou adresse"
                    aria-label="Rechercher un adhérent par nom, email, téléphone ou adresse"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="filter-genre">Genre</Label>
                    <Select onValueChange={setGenreFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-genre" aria-label="Filtrer par genre">
                            <SelectValue placeholder="Genre" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="H">H</SelectItem>
                            <SelectItem value="F">F</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="filter-cotisation">Cotisation</Label>
                    <Select onValueChange={setCotisationFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-cotisation" aria-label="Filtrer par statut de cotisation">
                            <SelectValue placeholder="Cotisation" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="À jour">À jour</SelectItem>
                            <SelectItem value="En retard">En retard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="filter-benevole">Bénévole</Label>
                    <Select onValueChange={setBenevoleFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-benevole" aria-label="Filtrer par statut de bénévole">
                            <SelectValue placeholder="Bénévole" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="Oui">Oui</SelectItem>
                            <SelectItem value="Non">Non</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="filter-faaf">Membre FAAF</Label>
                    <Select onValueChange={setFaafFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-faaf" aria-label="Filtrer par statut de membre FAAF">
                            <SelectValue placeholder="Membre FAAF" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="Oui">Oui</SelectItem>
                            <SelectItem value="Non">Non</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="filter-bureau">Bureau</Label>
                    <Select onValueChange={setBureauFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-bureau" aria-label="Filtrer par statut de membre du bureau">
                            <SelectValue placeholder="Bureau" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="Oui">Oui</SelectItem>
                            <SelectItem value="Non">Non</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="filter-droit-image">Droit à l'image</Label>
                    <Select onValueChange={setDroitImageFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-droit-image" aria-label="Filtrer par droit à l'image">
                            <SelectValue placeholder="Droit à l'image" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="Accordé">Accordé</SelectItem>
                            <SelectItem value="Refusé">Refusé</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="filter-age">Tranche d'âge</Label>
                    <Select onValueChange={setAgeFilter} defaultValue="Tous">
                        <SelectTrigger id="filter-age" aria-label="Filtrer par tranche d'âge">
                            <SelectValue placeholder="Tranche d'âge" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous</SelectItem>
                            <SelectItem value="-18">-18 ans</SelectItem>
                            <SelectItem value="18-30">18-30 ans</SelectItem>
                            <SelectItem value="31-50">31-50 ans</SelectItem>
                            <SelectItem value="50+">50+ ans</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>


      {filteredAdherents.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? 'Aucun adhérent ne correspond à vos critères de recherche.'
                : 'Aucun adhérent enregistré pour le moment.'
              }
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAdherents.map((adherent) => (
            <AdherentCard key={adherent.id} adherent={adherent} />
          ))}
        </div>
      )}
    </div>
  );
}
