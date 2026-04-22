'use client';

import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Upload, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { Admin, LogAdmin, Adherent } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { createAdminProfile, updateAdminProfile, updateAdminPassword, deleteAdminProfile } from "@/services/adminsService";
import { addLog } from "@/services/logsService";
import { deleteAllAdherents } from "@/services/adherentsService";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, orderBy, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminForm } from "@/components/admin/admin-form";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useAdminRole } from "@/contexts/admin-role-context";

const LOGS_PER_PAGE = 20;

function AdminPageSkeleton() {
    return (
        <div className="space-y-6">
            <header>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </header>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
}

export default function AdminPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const role = useAdminRole();
  
  const adminsQuery = useMemoFirebase(() => query(collection(db, 'admins')), [db]);
  const { data: administrateurs, isLoading: isLoadingAdmins } = useCollection<Admin>(adminsQuery);

  const logsQuery = useMemoFirebase(() => query(collection(db, 'logs_admin'), orderBy('dateAction', 'desc')), [db]);
  const { data: logsAdmin, isLoading: isLoadingLogs } = useCollection<LogAdmin>(logsQuery);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const paginatedLogs = useMemo(() => {
    if (!logsAdmin) return [];
    const start = (logsCurrentPage - 1) * LOGS_PER_PAGE;
    return logsAdmin.slice(start, start + LOGS_PER_PAGE);
  }, [logsAdmin, logsCurrentPage]);

  const totalLogsPages = useMemo(() => {
    return logsAdmin ? Math.ceil(logsAdmin.length / LOGS_PER_PAGE) : 0;
  }, [logsAdmin]);

  const handleOpenCreate = () => {
    setEditingAdmin(undefined);
    setIsFormDialogOpen(true);
  };

  const handleOpenEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsFormDialogOpen(true);
  };

  const handleSubmitAdmin = async (formData: Omit<Admin, 'id' | 'dateCreation'> & { password?: string }) => {
    setIsSubmitting(true);
    try {
        if (editingAdmin) {
            await updateAdminProfile(db, auth, editingAdmin.id, formData);
            if (formData.password) {
                await updateAdminPassword(auth, editingAdmin.id, formData.password);
            }
            await addLog(db, auth, `Modification de l'admin : ${formData.prenom} ${formData.nom}`);
            toast({ title: "Modifications enregistrées" });
        } else {
            await createAdminProfile(auth, formData as Omit<Admin, 'id' | 'dateCreation'> & { password: string });
            await addLog(db, auth, `Création du compte admin : ${formData.prenom} ${formData.nom}`);
            toast({ title: "Compte créé", description: "Le compte Firebase Auth et le profil ont été créés." });
        }
        setIsFormDialogOpen(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    try {
        await deleteAdminProfile(auth, admin.id);
        await addLog(db, auth, `Suppression de l'admin : ${admin.prenom} ${admin.nom}`);
        toast({ title: "Administrateur supprimé" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erreur", description: error.message });
    }
  };

  const handlePurgeAdherents = async () => {
    setIsPurging(true);
    try {
        await deleteAllAdherents(db);
        await addLog(db, auth, "Purge complète de la base des adhérents.");
        toast({ title: "Base nettoyée", description: "Tous les adhérents ont été supprimés." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de purge", description: error.message });
    } finally {
        setIsPurging(false);
    }
  };

  // Normalise un libellé de moyen de paiement (FR ou valeur brute) vers la valeur Firestore
  const normalizeMoyen = (raw: string): string | undefined => {
    const map: Record<string, string> = {
      'espèces': 'especes', 'especes': 'especes',
      'virement bancaire': 'virement', 'virement': 'virement',
      'terminal sumup': 'sumup', 'sumup': 'sumup',
      'chèque': 'cheque', 'cheque': 'cheque',
      'sur place (tiers)': 'sur_place', 'sur_place': 'sur_place',
    };
    return map[raw.toLowerCase().trim()];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("Le fichier CSV est vide ou ne contient que des en-têtes.");

        // Lecture des en-têtes pour détecter l'année de cotisation (ex: "DatePaiement_2026" → 2026)
        const headerValues = lines[0].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const hasCotisationColumns = headerValues.length >= 16;
        let cotisationYear = new Date().getFullYear();
        if (hasCotisationColumns && headerValues[13]) {
          const m = headerValues[13].match(/(\d{4})/);
          if (m) cotisationYear = parseInt(m[1]);
        }

        const existingSnap = await getDocs(collection(db, 'adherents'));
        const existingAdherents = existingSnap.docs.map(d => ({ id: d.id, ...d.data() as Adherent }));

        // Pré-chargement des cotisations existantes pour l'année détectée (upsert)
        const cotisSnap = await getDocs(query(collection(db, 'cotisations'), where('annee', '==', cotisationYear)));
        const cotisationByAdherentId = new Map<string, string>(); // adherentId → doc id
        cotisSnap.docs.forEach(d => cotisationByAdherentId.set(d.data().adherentId as string, d.id));

        const rows = lines.slice(1);
        const batch = writeBatch(db);
        let createCount = 0;
        let updateCount = 0;

        for (const row of rows) {
          const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

          const csvData = {
            prenom: values[0] || "",
            nom: values[1] || "",
            email: values[2] || "",
            telephone: values[3] || "",
            adresse: values[4] || "",
            dateNaissance: values[5] ? new Date(values[5]).toISOString() : "",
            genre: (values[6] as 'H' | 'F' | 'Autre') || "Autre",
            dateInscription: values[7] ? new Date(values[7]).toISOString() : new Date().toISOString(),
            estMembreBureau: values[8]?.toLowerCase() === 'oui',
            estBenevole: values[9]?.toLowerCase() === 'oui',
            estMembreFaaf: values[10]?.toLowerCase() === 'oui',
            accordeDroitImage: values[11]?.toLowerCase() === 'oui',
            cotisationAJour: values[12]?.toLowerCase() === 'oui',
          };

          // Colonnes cotisation (13-15) — optionnelles
          const rawDatePaiement = hasCotisationColumns ? values[13] : '';
          const rawMontant      = hasCotisationColumns ? values[14] : '';
          const rawMoyen        = hasCotisationColumns ? values[15] : '';
          const datePaiement    = rawDatePaiement ? new Date(rawDatePaiement).toISOString() : new Date().toISOString();
          const montant         = rawMontant ? parseFloat(rawMontant.replace(',', '.')) : (csvData.estMembreFaaf ? 40 : 15);
          const moyenPaiement   = rawMoyen ? normalizeMoyen(rawMoyen) : undefined;

          const existingMatch = existingAdherents.find(ex => {
            const sameEmail = csvData.email && ex.email.toLowerCase() === csvData.email.toLowerCase();
            const sameName = ex.nom.toLowerCase() === csvData.nom.toLowerCase() &&
                             ex.prenom.toLowerCase() === csvData.prenom.toLowerCase();
            return sameEmail || sameName;
          });

          if (existingMatch) {
            // UPSERT adhérent
            const updates: any = {};
            if (values[0]) updates.prenom = values[0];
            if (values[1]) updates.nom = values[1];
            if (values[2]) updates.email = values[2];
            if (values[3]) updates.telephone = values[3];
            if (values[4]) updates.adresse = values[4];
            if (values[5]) updates.dateNaissance = new Date(values[5]).toISOString();
            if (values[6]) updates.genre = values[6] as 'H' | 'F' | 'Autre';
            if (values[7]) updates.dateInscription = new Date(values[7]).toISOString();
            if (values[8] !== "") updates.estMembreBureau = values[8].toLowerCase() === 'oui';
            if (values[9] !== "") updates.estBenevole = values[9].toLowerCase() === 'oui';
            if (values[10] !== "") updates.estMembreFaaf = values[10].toLowerCase() === 'oui';
            if (values[11] !== "") updates.accordeDroitImage = values[11].toLowerCase() === 'oui';
            if (values[12] !== "") updates.cotisationAJour = values[12].toLowerCase() === 'oui';

            if (Object.keys(updates).length > 0) {
              batch.update(doc(db, 'adherents', existingMatch.id), updates);
              updateCount++;
            }

            // UPSERT cotisation si colonnes présentes et date renseignée
            if (hasCotisationColumns && rawDatePaiement) {
              const existingCotisId = cotisationByAdherentId.get(existingMatch.id);
              const cotisData: any = { datePaiement, montant, annee: cotisationYear, adherentId: existingMatch.id };
              if (moyenPaiement) cotisData.moyenPaiement = moyenPaiement;
              if (existingCotisId) {
                batch.update(doc(db, 'cotisations', existingCotisId), cotisData);
              } else {
                batch.set(doc(collection(db, 'cotisations')), cotisData);
              }
            }
          } else {
            // Création d'un nouvel adhérent
            const newDocRef = doc(collection(db, 'adherents'));
            batch.set(newDocRef, csvData);
            createCount++;

            if (csvData.cotisationAJour) {
              const cotisData: any = {
                adherentId: newDocRef.id,
                annee: cotisationYear,
                datePaiement,
                montant,
              };
              if (moyenPaiement) cotisData.moyenPaiement = moyenPaiement;
              batch.set(doc(collection(db, 'cotisations')), cotisData);
            }
          }
        }

        if (createCount > 0 || updateCount > 0) {
          await batch.commit();
        }

        const logMsg = `Importation CSV : ${createCount} nouveaux adhérents créés, ${updateCount} adhérents mis à jour.`;
        await addLog(db, auth, logMsg);

        toast({
          title: "Importation terminée",
          description: `Succès : ${createCount} créés, ${updateCount} mis à jour.`,
        });

      } catch (err: any) {
        console.error("CSV Import Error:", err);
        toast({
          variant: 'destructive',
          title: "Échec de l'importation",
          description: "Le fichier CSV est mal formaté ou contient des erreurs.",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };
  
  const isModerateur = role === 'Modérateur';

  // Pour les modérateurs : afficher uniquement leur propre compte
  const visibleAdmins = isModerateur
    ? (administrateurs ?? []).filter(a => a.id === user?.uid)
    : (administrateurs ?? []);

  if (isLoadingAdmins || isLoadingLogs) return <AdminPageSkeleton />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          {isModerateur
            ? "Gérez votre compte et consultez vos informations."
            : "Gérez les accès, importez des données et consultez le journal d'audit."}
        </p>
      </header>

      <div className={isModerateur ? "grid gap-6" : "grid gap-6 lg:grid-cols-3"}>
        <Card className={isModerateur ? "" : "lg:col-span-2"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {isModerateur ? "Mon compte" : "Comptes Administrateurs"}
                    </CardTitle>
                    <CardDescription>
                      {isModerateur
                        ? "Vos informations de compte administrateur."
                        : "Liste des personnes autorisées à gérer l'association."}
                    </CardDescription>
                </div>
                {!isModerateur && (
                    <Button onClick={handleOpenCreate} size="sm" className="min-h-[40px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nouvel Admin
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <AdminTable
                    admins={visibleAdmins}
                    currentUserId={user?.uid}
                    onEdit={handleOpenEdit}
                    onDelete={isModerateur ? undefined : handleDeleteAdmin}
                />
            </CardContent>
        </Card>

        {!isModerateur && (
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Base de données</CardTitle>
                    <CardDescription>Maintenance et imports CSV (Upsert).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        variant="outline"
                        className="w-full min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Importer un fichier CSV d'adhérents"
                      >
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isImporting ? "Importation en cours..." : "Importer / Mettre à jour CSV"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileUpload}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Zone de Danger
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">La purge supprimera tous les adhérents, cotisations et inscriptions sans retour possible.</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full min-h-[40px]" disabled={isPurging}>
                                    {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Purger tous les Adhérents
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la purge totale ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Cette action est <strong>définitive</strong>. Toutes les données relatives aux adhérents (profils, cotisations, inscriptions aux événements) seront effacées.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePurgeAdherents} className="bg-destructive hover:bg-destructive/90">Confirmer la purge</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            <Card className="h-fit">
                <CardHeader>
                    <CardTitle>Journal d'Audit</CardTitle>
                    <CardDescription>Actions récentes (Page {logsCurrentPage}/{totalLogsPages}).</CardDescription>
                </CardHeader>
                <CardContent className="px-2">
                    <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                            <caption className="sr-only">Journal des actions administratives</caption>
                            <TableBody>
                            {paginatedLogs.map(log => (
                                <TableRow key={log.id} className="hover:bg-transparent">
                                    <TableCell className="py-2">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-semibold">{log.nomAdmin}</span>
                                            <span className="text-sm">{log.actionRealisee}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(log.dateAction).toLocaleString('fr-FR')}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!logsAdmin || logsAdmin.length === 0) && (
                                <TableRow>
                                    <TableCell className="text-center text-muted-foreground py-4 italic text-sm">
                                        Aucun log disponible.
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                    {totalLogsPages > 1 && (
                        <div className="flex items-center justify-between gap-2 p-4 border-t mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLogsCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={logsCurrentPage === 1}
                                className="h-10 w-10 p-0 focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label="Page de logs précédente"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-medium">Page {logsCurrentPage} sur {totalLogsPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLogsCurrentPage(prev => Math.min(totalLogsPages, prev + 1))}
                                disabled={logsCurrentPage === totalLogsPages}
                                className="h-10 w-10 p-0 focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label="Page de logs suivante"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "Modifier l'Administrateur" : "Ajouter un Administrateur"}</DialogTitle>
            <DialogDescription>
                {editingAdmin 
                    ? `Modifiez les informations de ${editingAdmin.prenom}.` 
                    : "Créez un profil pour un nouvel administrateur. L'utilisateur devra s'inscrire avec cet email."}
            </DialogDescription>
          </DialogHeader>
          <AdminForm
            initialData={editingAdmin}
            onSubmit={handleSubmitAdmin}
            onCancel={() => setIsFormDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
