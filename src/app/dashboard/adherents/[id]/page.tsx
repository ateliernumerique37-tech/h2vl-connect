'use client';

import { useParams, useRouter } from 'next/navigation';
import type { Adherent, Cotisation } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from 'react';
import { Pencil, ChevronLeft, Phone, MapPin, Mail, Calendar, User, CreditCard, CheckCircle2, XCircle, Copy, Check, PhoneCall } from "lucide-react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-64" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        </div>
    );
}

export default function AdherentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  
  const id = params?.id as string;
  
  const adherentRef = useMemoFirebase(() => id ? doc(db, 'adherents', id) : null, [db, id]);
  const { data: adherent, isLoading: isLoadingAdherent, error: adherentError } = useDoc<Adherent>(adherentRef);

  const cotisationsQuery = useMemoFirebase(() => id ? query(
    collection(db, 'cotisations'), 
    where('adherentId', '==', id)
  ) : null, [db, id]);
  const { data: rawCotisations, isLoading: isLoadingCotisations } = useCollection<Cotisation>(cotisationsQuery);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const adherentCotisations = useMemo(() => {
    if (!rawCotisations) return [];
    return [...rawCotisations].sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());
  }, [rawCotisations]);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (adherentError) {
    return (
      <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <p className="font-bold">Erreur de chargement.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  if (!id || isLoadingAdherent || isLoadingCotisations) {
      return <ProfileSkeleton />;
  }

  if (!adherent) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <User className="h-16 w-16 text-muted-foreground opacity-20" />
            <h2 className="text-xl font-semibold">Adhérent introuvable</h2>
            <p className="text-muted-foreground">La fiche que vous recherchez n'existe pas ou a été supprimée.</p>
            <Button asChild><Link href="/dashboard/adherents">Retour à la liste</Link></Button>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/adherents" aria-label="Retour à la liste des adhérents">
                <ChevronLeft className="h-6 w-6" />
            </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{adherent.prenom} {adherent.nom}</h1>
        </div>
        <Button asChild className="min-h-[44px] shadow-sm">
            <Link href={`/dashboard/adherents/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier le profil
            </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Informations Personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Email Section */}
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Email</p>
                    <div className="flex items-center justify-between group rounded-md hover:bg-muted/30 p-1 -ml-1 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{adherent.email}</span>
                        </div>
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            onClick={() => handleCopy(adherent.email, 'email')}
                            aria-label={`Copier l'adresse email de ${adherent.prenom} ${adherent.nom}`}
                        >
                            {copiedField === 'email' ? (
                                <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold"><Check className="h-3 w-3" /> Copié !</span>
                            ) : (
                                <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Telephone Section */}
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Téléphone</p>
                    <div className="flex items-center justify-between group rounded-md hover:bg-muted/30 p-1 -ml-1 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{adherent.telephone || 'Non renseigné'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {adherent.telephone && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    asChild
                                >
                                    <a href={`tel:${adherent.telephone}`} aria-label={`Appeler ${adherent.prenom} ${adherent.nom}`}>
                                        <PhoneCall className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </Button>
                            )}
                            <Button 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                onClick={() => handleCopy(adherent.telephone, 'tel')}
                                aria-label={`Copier le numéro de téléphone de ${adherent.prenom} ${adherent.nom}`}
                                disabled={!adherent.telephone}
                            >
                                {copiedField === 'tel' ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold"><Check className="h-3 w-3" /> Copié !</span>
                                ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Adresse Section */}
                <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Adresse postale</p>
                    <div className="flex items-center justify-between group rounded-md hover:bg-muted/30 p-1 -ml-1 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <MapPin className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{adherent.adresse || 'Non renseignée'}</span>
                        </div>
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            onClick={() => handleCopy(adherent.adresse, 'adresse')}
                            aria-label={`Copier l'adresse de ${adherent.prenom} ${adherent.nom}`}
                            disabled={!adherent.adresse}
                        >
                            {copiedField === 'adresse' ? (
                                <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold"><Check className="h-3 w-3" /> Copié !</span>
                            ) : (
                                <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </Button>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Date de naissance</p>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                            {adherent.dateNaissance ? new Date(adherent.dateNaissance).toLocaleDateString('fr-FR') : 'Non renseignée'}
                        </span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Genre</p>
                    <Badge variant="outline" className="mt-1">{adherent.genre === 'H' ? 'Homme' : adherent.genre === 'F' ? 'Femme' : 'Autre'}</Badge>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Statuts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
                { label: 'Cotisation à jour', value: adherent.cotisationAJour },
                { label: 'Membre du bureau', value: adherent.estMembreBureau },
                { label: 'Bénévole actif', value: adherent.estBenevole },
                { label: 'Membre FAAF', value: adherent.estMembreFaaf },
                { label: 'Droit à l\'image', value: adherent.accordeDroitImage },
            ].map((statut, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{statut.label}</span>
                    {statut.value ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/30" />
                    )}
                </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Historique des Cotisations
          </CardTitle>
          <CardDescription>Suivi des règlements annuels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Année</TableHead>
                <TableHead>Date de paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adherentCotisations.length > 0 ? (
                adherentCotisations.map((cotisation) => (
                  <TableRow key={cotisation.id}>
                    <TableCell className="font-medium">{cotisation.annee}</TableCell>
                    <TableCell>{new Date(cotisation.datePaiement).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right font-bold">{cotisation.montant.toFixed(2)} €</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">
                    Aucun historique financier.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
