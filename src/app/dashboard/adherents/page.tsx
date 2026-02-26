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
import { collection, query } from 'firebase/firestore';

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
  // Simplified query without complex orderBy to avoid immediate index requirement
  const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents')), [db]);
  const { data: adherents, isLoading } = useCollection<Adherent>(adherentsQuery);

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
          adherent.telephone?.toLowerCase().includes(searchLower)
        );
      })
      .filter(adherent => genreFilter === 'Tous' ? true : adherent.genre === genreFilter)
      .filter(adherent => cotisationFilter === 'Tous' ? true : (cotisationFilter === 'À jour' ? adherent.cotisationAJour : !adherent.cotisationAJour))
      .filter(adherent => benevoleFilter === 'Tous' ? true : (benevoleFilter === 'Oui' ? adherent.estBenevole : !adherent.estBenevole))
      .filter(adherent => faafFilter === 'Tous' ? true : (faafFilter === 'Oui' ? adherent.estMembreFaaf : !adherent.estMembreFaaf))
      .filter(adherent => bureauFilter === 'Tous' ? true : (bureauFilter === 'Oui' ? adherent.estMembreBureau : !adherent.estMembreBureau))
      .filter(adherent => droitImageFilter === 'Tous' ? true : (droitImageFilter === 'Accordé' ? adherent.accordeDroitImage : !adherent.accordeDroitImage))
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
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [adherents, searchTerm, genreFilter, cotisationFilter, benevoleFilter, faafFilter, bureauFilter, droitImageFilter, ageFilter]);
  
  if (isLoading) return <AdherentsPageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liste des Adhérents</h1>
          <p className="text-muted-foreground">Gérez les membres de votre association.</p>
        </div>
        <Button asChild>
            <Link href="/dashboard/adherents/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un adhérent
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtres et Recherche</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="search-adherent">Rechercher</Label>
                <Input
                    id="search-adherent"
                    placeholder="Nom, email, téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <Select onValueChange={setGenreFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="Genre"><SelectValue placeholder="Genre" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="H">H</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                </Select>
                 <Select onValueChange={setCotisationFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="Cotisation"><SelectValue placeholder="Cotisation" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="À jour">À jour</SelectItem>
                        <SelectItem value="En retard">En retard</SelectItem>
                    </SelectContent>
                </Select>
                 <Select onValueChange={setBenevoleFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="Bénévole"><SelectValue placeholder="Bénévole" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="Oui">Oui</SelectItem>
                        <SelectItem value="Non">Non</SelectItem>
                    </SelectContent>
                </Select>
                 <Select onValueChange={setFaafFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="FAAF"><SelectValue placeholder="FAAF" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="Oui">Oui</SelectItem>
                        <SelectItem value="Non">Non</SelectItem>
                    </SelectContent>
                </Select>
                 <Select onValueChange={setBureauFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="Bureau"><SelectValue placeholder="Bureau" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="Oui">Oui</SelectItem>
                        <SelectItem value="Non">Non</SelectItem>
                    </SelectContent>
                </Select>
                 <Select onValueChange={setDroitImageFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="Droit image"><SelectValue placeholder="Droit image" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="Accordé">Accordé</SelectItem>
                        <SelectItem value="Refusé">Refusé</SelectItem>
                    </SelectContent>
                </Select>
                <Select onValueChange={setAgeFilter} defaultValue="Tous">
                    <SelectTrigger aria-label="Âge"><SelectValue placeholder="Âge" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Tous">Tous</SelectItem>
                        <SelectItem value="-18">-18 ans</SelectItem>
                        <SelectItem value="18-30">18-30 ans</SelectItem>
                        <SelectItem value="31-50">31-50 ans</SelectItem>
                        <SelectItem value="50+">50+ ans</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      {filteredAdherents.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">Aucun adhérent trouvé.</p>
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