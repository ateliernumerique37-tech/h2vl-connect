'use client';

import { useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Loader2, Upload, AlertTriangle } from "lucide-react";
import type { Admin, LogAdmin, Adherent } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { addAdmin, deleteAdmin } from "@/services/adminsService";
import { addLog } from "@/services/logsService";
import { batchAddAdherents, deleteAllAdherents } from "@/services/adherentsService";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";

function AdminPageSkeleton() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Administrateur</h1>
                <p className="text-muted-foreground">Chargement des outils d'administration...</p>
            </header>
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
}

export default function AdminPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  
  const adminsQuery = useMemoFirebase(() => query(collection(db, 'admins')), [db]);
  const { data: administrateurs, isLoading: isLoadingAdmins } = useCollection<Admin>(adminsQuery);

  const logsQuery = useMemoFirebase(() => query(collection(db, 'logs_admin'), orderBy('dateAction', 'desc')), [db]);
  const { data: logsAdmin, isLoading: isLoadingLogs } = useCollection<LogAdmin>(logsQuery);

  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ prenom: '', nom: '', email: '', role: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAdminData({ ...newAdminData, [e.target.name]: e.target.value });
  };

  const handleAddAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
        const { password, ...adminInfo } = newAdminData;
        await addAdmin(db, auth, adminInfo, password);
        await addLog(db, auth, `Création de l'administrateur : ${adminInfo.prenom} ${adminInfo.nom}`);
        
        setIsAddAdminDialogOpen(false);
        toast({ title: "Administrateur ajouté", description: `Compte créé pour ${adminInfo.prenom}.` });
        setNewAdminData({ prenom: '', nom: '', email: '', role: '', password: '' });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleDeleteAdmin = async (admin: Admin) => {
    try {
        await deleteAdmin(db, admin.id);
        await addLog(db, auth, `Suppression de l'administrateur : ${admin.prenom} ${admin.nom}`);
        toast({ title: "Succès", description: "Administrateur supprimé." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erreur", description: error.message });
    }
  }

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
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsImporting(true);
      const text = e.target?.result as string;
      try {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("Fichier vide.");
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
        await addLog(db, auth, `Import de ${newAdherents.length} adhérents.`);
        toast({ title: "Succès", description: "Importation terminée." });
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
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Administrateur</h1>
        <p className="text-muted-foreground">Gestion des accès et maintenance de la base.</p>
      </header>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Maintenance</CardTitle>
                <CardDescription>Outils de gestion de données.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} variant="outline">
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Importer CSV
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
                </div>
                
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        Zone de Danger
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full" disabled={isPurging}>
                                {isPurging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Supprimer TOUS les adhérents
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Action irréversible</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Cette action supprimera définitivement tous les adhérents, cotisations et inscriptions. Êtes-vous sûr ?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurgeAdherents} className="bg-destructive text-destructive-foreground">Confirmer la suppression</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Administrateurs</CardTitle>
                    <CardDescription>Gérer les comptes d'accès.</CardDescription>
                </div>
                <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="icon" variant="ghost"><PlusCircle className="h-5 w-5" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleAddAdmin}>
                            <DialogHeader><DialogTitle>Nouvel Admin</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Input name="prenom" placeholder="Prénom" required onChange={handleInputChange} />
                                <Input name="nom" placeholder="Nom" required onChange={handleInputChange} />
                                <Input name="email" type="email" placeholder="Email" required onChange={handleInputChange} />
                                <Input name="password" type="password" placeholder="Mot de passe" required onChange={handleInputChange} />
                                <Input name="role" placeholder="Poste (ex: Président)" onChange={handleInputChange} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>Créer</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {administrateurs?.map(admin => (
                            <TableRow key={admin.id}>
                                <TableCell>{admin.prenom} {admin.nom}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAdmin(admin)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Journal d'audit</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {logsAdmin?.map(log => (
                <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground w-32">{new Date(log.dateAction).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium text-sm">{log.nomAdmin}</TableCell>
                    <TableCell className="text-sm">{log.actionRealisee}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
