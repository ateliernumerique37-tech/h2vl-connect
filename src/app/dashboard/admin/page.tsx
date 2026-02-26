'use client';

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Upload, AlertTriangle, ShieldCheck } from "lucide-react";
import type { Admin, LogAdmin, Adherent } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { createAdminProfile, updateAdminProfile, deleteAdminProfile } from "@/services/adminsService";
import { addLog } from "@/services/logsService";
import { batchAddAdherents, deleteAllAdherents } from "@/services/adherentsService";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminForm } from "@/components/admin/admin-form";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

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
  const { user } = useUser();
  
  const adminsQuery = useMemoFirebase(() => query(collection(db, 'admins')), [db]);
  const { data: administrateurs, isLoading: isLoadingAdmins } = useCollection<Admin>(adminsQuery);

  const logsQuery = useMemoFirebase(() => query(collection(db, 'logs_admin'), orderBy('dateAction', 'desc')), [db]);
  const { data: logsAdmin, isLoading: isLoadingLogs } = useCollection<LogAdmin>(logsQuery);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreate = () => {
    setEditingAdmin(undefined);
    setIsFormDialogOpen(true);
  };

  const handleOpenEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsFormDialogOpen(true);
  };

  const handleSubmitAdmin = async (formData: Omit<Admin, 'id' | 'dateCreation'>) => {
    setIsSubmitting(true);
    try {
        if (editingAdmin) {
            await updateAdminProfile(db, editingAdmin.id, formData);
            await addLog(db, { currentUser: user } as any, `Modification de l'admin : ${formData.prenom} ${formData.nom}`);
            toast({ title: "Modifications enregistrées" });
        } else {
            await createAdminProfile(db, formData);
            await addLog(db, { currentUser: user } as any, `Création du profil admin : ${formData.prenom} ${formData.nom}`);
            toast({ title: "Profil administrateur créé", description: "L'utilisateur peut maintenant s'inscrire avec cet email." });
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
        await deleteAdminProfile(db, admin.id);
        await addLog(db, { currentUser: user } as any, `Suppression de l'admin : ${admin.prenom} ${admin.nom}`);
        toast({ title: "Administrateur supprimé" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erreur", description: error.message });
    }
  };

  const handlePurgeAdherents = async () => {
    setIsPurging(true);
    try {
        await deleteAllAdherents(db);
        await addLog(db, { currentUser: user } as any, "Purge complète de la base des adhérents.");
        toast({ title: "Base nettoyée", description: "Tous les adhérents ont été supprimés." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de purge", description: error.message });
    } finally {
        setIsPurging(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsImporting(true);
      const text = e.target?.result as string;
      try {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("Fichier vide ou corrompu.");
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1);
        const newAdherents: Omit<Adherent, 'id'>[] = rows.map(row => {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          const d: any = {};
          headers.forEach((h, i) => d[h] = values[i]);
          return {
            prenom: d.Prenom || '',
            nom: d.Nom || '',
            email: d.Email || '',
            telephone: d.Telephone || '',
            adresse: d.Adresse || '',
            dateNaissance: d.DateNaissance ? new Date(d.DateNaissance).toISOString() : '',
            genre: d.Genre || 'Autre',
            dateInscription: new Date().toISOString(),
            estMembreBureau: d.MembreBureau === 'oui',
            estBenevole: d.Benevole === 'oui',
            estMembreFaaf: d.MembreFAAF === 'oui',
            accordeDroitImage: d.DroitImage === 'oui',
            cotisationAJour: d.CotisationAJour === 'oui',
          };
        });
        await batchAddAdherents(db, newAdherents);
        await addLog(db, { currentUser: user } as any, `Import de ${newAdherents.length} adhérents.`);
        toast({ title: "Importation terminée", description: `${newAdherents.length} adhérents ont été ajoutés.` });
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Erreur CSV", description: err.message });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };
  
  if (isLoadingAdmins || isLoadingLogs) return <AdminPageSkeleton />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">Gérez les accès, importez des données et consultez le journal d'audit.</p>
      </header>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Comptes Administrateurs
                    </CardTitle>
                    <CardDescription>Liste des personnes autorisées à gérer l'association.</CardDescription>
                </div>
                <Button onClick={handleOpenCreate} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouvel Admin
                </Button>
            </CardHeader>
            <CardContent>
                {administrateurs && (
                    <AdminTable
                        admins={administrateurs}
                        currentUserId={user?.uid}
                        onEdit={handleOpenEdit}
                        onDelete={handleDeleteAdmin}
                    />
                )}
            </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Base de données</CardTitle>
                    <CardDescription>Maintenance et imports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} variant="outline" className="w-full">
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Importer CSV Adhérents
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
                    
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Zone de Danger
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">La purge supprimera tous les adhérents, cotisations et inscriptions sans retour possible.</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full" disabled={isPurging}>
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
                    <CardTitle>Dernières Actions</CardTitle>
                    <CardDescription>Audit en temps réel.</CardDescription>
                </CardHeader>
                <CardContent className="px-2">
                    <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableBody>
                            {logsAdmin?.slice(0, 10).map(log => (
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
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
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
