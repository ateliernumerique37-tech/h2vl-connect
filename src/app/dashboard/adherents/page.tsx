'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Adherent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import { AdherentCard } from "@/components/adherent-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

const ITEMS_PER_PAGE = 20;

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
  const adherentsQuery = useMemoFirebase(() => query(collection(db, 'adherents')), [db]);
  const { data: adherents, isLoading } = useCollection<Adherent>(adherentsQuery);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('Tous');
  const [cotisationFilter, setCotisationFilter] = useState('Tous');
  const [benevoleFilter, setBenevoleFilter] = useState('Tous');
  const [faafFilter, setFaafFilter] = useState('Tous');
  const [bureauFilter, setBureauFilter] = useState('Tous');
  const [droitImageFilter, setDroitImageFilter] = useState('Tous');
  const [ageFilter, setAgeFilter] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce logic for search term (WCAG Performance & Focus stability)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset to first page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, genreFilter, cotisationFilter, benevoleFilter, faafFilter, bureauFilter, droitImageFilter, ageFilter]);

  const filteredAdherents = useMemo(() => {
    if (!adherents) return [];
    return adherents
      .filter(adherent => {
        const searchLower = debouncedSearchTerm.toLowerCase();
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
  }, [adherents, debouncedSearchTerm, genreFilter, cotisationFilter, benevoleFilter, faafFilter, bureauFilter, droitImageFilter, ageFilter]);

  const totalPages = Math.ceil(filteredAdherents.length / ITEMS_PER_PAGE);
  const paginatedAdherents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdherents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdherents, currentPage]);

  const handleExportCSV = () => {
    if (!adherents || adherents.length === 0) return;

    const headers = [
      "Prenom", "Nom", "Email", "Telephone", "Adresse", "DateNaissance", 
      "Genre", "DateInscription", "MembreBureau", "Benevole", "MembreFAAF", 
      "DroitImage", "CotisationAJour"
    ];

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      try {
        return dateStr.split('T')[0];
      } catch (e) {
        return "";
      }
    };

    const formatBool = (bool: boolean) => (bool ? "Oui" : "Non");

    const rows = adherents.map(a => [
      a.prenom,
      a.nom,
      a.email,
      a.telephone || "",
      a.adresse || "",
      formatDate(a.dateNaissance),
      a.genre || "Autre",
      formatDate(a.dateInscription),
      formatBool(a.estMembreBureau),
      formatBool(a.estBenevole),
      formatBool(a.estMembreFaaf),
      formatBool(a.accordeDroitImage),
      formatBool(a.cotisationAJour)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `base_adherents_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) return <AdherentsPageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Live Region for Screen Readers (WCAG 2.2 Compliance) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {filteredAdherents.length > 0 
          ? `Affichage de ${filteredAdherents.length} adhérent${filteredAdherents.length > 1 ? 's' : ''} sur un total de ${adherents?.length || 0}.`
          : "Aucun adhérent ne correspond à vos critères de recherche."}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liste des Adhérents</h1>
          <p className="text-muted-foreground">Gérez les membres de votre association.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleExportCSV}
            disabled={!adherents || adherents.length === 0}
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
            aria-label="Exporter la base complète des adhérents au format CSV"
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter la base (CSV)
          </Button>
          <Button asChild className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]">
              <Link href="/dashboard/adherents/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ajouter un adhérent
              </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtres et Recherche</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="search-adherent">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                      id="search-adherent"
                      className="pl-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
                      placeholder="Nom, email, téléphone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Rechercher un adhérent par nom, email ou téléphone"
                  />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <div className="space-y-1">
                  <Select onValueChange={setGenreFilter} defaultValue="Tous" value={genreFilter}>
                      <SelectTrigger aria-label="Filtrer par genre" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="Genre" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Tous les genres</SelectItem>
                          <SelectItem value="H">H</SelectItem>
                          <SelectItem value="F">F</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Select onValueChange={setCotisationFilter} defaultValue="Tous" value={cotisationFilter}>
                      <SelectTrigger aria-label="Filtrer par statut de cotisation" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="Cotisation" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Toutes cotisations</SelectItem>
                          <SelectItem value="À jour">À jour</SelectItem>
                          <SelectItem value="En retard">En retard</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Select onValueChange={setBenevoleFilter} defaultValue="Tous" value={benevoleFilter}>
                      <SelectTrigger aria-label="Filtrer par statut bénévole" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="Bénévole" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Tous bénévoles</SelectItem>
                          <SelectItem value="Oui">Bénévole : Oui</SelectItem>
                          <SelectItem value="Non">Bénévole : Non</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Select onValueChange={setFaafFilter} defaultValue="Tous" value={faafFilter}>
                      <SelectTrigger aria-label="Filtrer par appartenance FAAF" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="FAAF" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Tous FAAF</SelectItem>
                          <SelectItem value="Oui">FAAF : Oui</SelectItem>
                          <SelectItem value="Non">FAAF : Non</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Select onValueChange={setBureauFilter} defaultValue="Tous" value={bureauFilter}>
                      <SelectTrigger aria-label="Filtrer par appartenance au bureau" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="Bureau" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Tous bureau</SelectItem>
                          <SelectItem value="Oui">Bureau : Oui</SelectItem>
                          <SelectItem value="Non">Bureau : Non</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Select onValueChange={setDroitImageFilter} defaultValue="Tous" value={droitImageFilter}>
                      <SelectTrigger aria-label="Filtrer par droit à l'image" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="Droit image" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Tous droits image</SelectItem>
                          <SelectItem value="Accordé">Accordé</SelectItem>
                          <SelectItem value="Refusé">Refusé</SelectItem>
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Select onValueChange={setAgeFilter} defaultValue="Tous" value={ageFilter}>
                      <SelectTrigger aria-label="Filtrer par tranche d'âge" className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]">
                        <SelectValue placeholder="Âge" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Tous">Tous âges</SelectItem>
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

      {paginatedAdherents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center" role="alert">
            <Search className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucun adhérent ne correspond à cette recherche.</p>
            <p className="text-sm text-muted-foreground">Modifiez vos filtres ou votre recherche pour voir plus de résultats.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedAdherents.map((adherent) => (
              <AdherentCard key={adherent.id} adherent={adherent} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 py-4 border-t" aria-label="Pagination des adhérents">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Aller à la page précédente"
                className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>
              <div className="text-sm font-medium" aria-current="page">
                Page {currentPage} sur {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                aria-label="Aller à la page suivante"
                className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
