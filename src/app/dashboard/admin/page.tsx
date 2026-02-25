'use client';

import { useState, useEffect, useRef } from "react";
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
import { PlusCircle, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import type { Admin, LogAdmin, Adherent } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getAdmins, addAdmin, deleteAdmin } from "@/services/adminsService";
import { getLogs, addLog } from "@/services/logsService";
import { batchAddAdherents } from "@/services/adherentsService";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useFirestore } from "@/firebase";

function AdminPageSkeleton() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Tableau de bord Administrateur</h1>
                <p className="text-muted-foreground">
                    Gérez les accès, consultez l'historique des actions et utilisez les outils IA.
                </p>
            </header>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle role="heading" aria-level={2}>Gestion des administrateurs</CardTitle>
                        <CardDescription>Ajoutez, modifiez ou supprimez les administrateurs.</CardDescription>
                    </div>
                    <Skeleton className="h-10 w-36" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle role="heading" aria-level={2}>Journal d'audit</CardTitle>
                    <CardDescription>Historique des actions réalisées sur la plateforme.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function AdminPage() {
  const [administrateurs, setAdministrateurs] = useState<Admin[]>([]);
  const [logsAdmin, setLogsAdmin] = useState<LogAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ prenom: '', nom: '', email: '', role: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  useEffect(() => {
    if (!db) return;
    async function fetchData() {
        try {
            const [adminsData, logsData] = await Promise.all([getAdmins(db), getLogs(db)]);
            setAdministrateurs(adminsData);
            setLogsAdmin(logsData);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données administrateur." });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [db, toast]);

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
        
        const [adminsData, logsData] = await Promise.all([getAdmins(db), getLogs(db)]);
        setAdministrateurs(adminsData);
        setLogsAdmin(logsData);

        setIsAddAdminDialogOpen(false);
        toast({
            title: "Administrateur ajouté",
            description: `Le compte pour ${adminInfo.prenom} ${adminInfo.nom} a été créé.`,
        });
        setNewAdminData({ prenom: '', nom: '', email: '', role: '', password: '' });
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Erreur",
            description: error.message || "Impossible d'ajouter l'administrateur."
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleDeleteAdmin = async (admin: Admin) => {
    try {
        await deleteAdmin(db, admin.id);
        await addLog(db, auth, `Suppression de l'administrateur : ${admin.prenom} ${admin.nom}`);
        
        const [adminsData, logsData] = await Promise.all([getAdmins(db), getLogs(db)]);
        setAdministrateurs(adminsData);
        setLogsAdmin(logsData);

        toast({
            title: "Administrateur supprimé",
            description: `Le compte de ${admin.prenom} ${admin.nom} a été supprimé.`,
        });
    } catch (error: any) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: "Erreur de suppression",
            description: error.message || "Impossible de supprimer l'administrateur."
        });
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      setIsImporting(true);
      const text = e.target?.result as string;
      let adherentsCount = 0;

      try {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error("Le fichier CSV est vide ou ne contient que l'en-tête.");
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1);
        adherentsCount = rows.length;

        toast({
          title: "Importation en cours...",
          description: `Importation de ${adherentsCount} adhérents en cours, veuillez patienter.`,
        });

        const toBoolean = (value: string | undefined) => (value || '').trim().toLowerCase() === 'oui';
        
        const requiredHeaders = ['Prenom', 'Nom', 'Email'];
        for (const rh of requiredHeaders) {
            if (!headers.includes(rh)) {
                throw new Error(`Colonne manquante dans le fichier CSV : ${rh}`);
            }
        }

        const newAdherents: Omit<Adherent, 'id'>[] = rows.map(row => {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          const adherentData: { [key: string]: any } = {};
          headers.forEach((header, index) => {
            adherentData[header] = values[index];
          });
          
          return {
            prenom: adherentData.Prenom || '',
            nom: adherentData.Nom || '',
            email: adherentData.Email || '',
            telephone: adherentData.Telephone || '',
            adresse: adherentData.Adresse || '',
            dateNaissance: adherentData.DateNaissance ? new Date(adherentData.DateNaissance).toISOString() : '',
            genre: ['H', 'F', 'Autre'].includes(adherentData.Genre) ? adherentData.Genre : 'Autre',
            dateInscription: adherentData.DateInscription ? new Date(adherentData.DateInscription).toISOString() : new Date().toISOString(),
            estMembreBureau: toBoolean(adherentData.MembreBureau),
            estBenevole: toBoolean(adherentData.Benevole),
            estMembreFaaf: toBoolean(adherentData.MembreFAAF),
            accordeDroitImage: toBoolean(adherentData.DroitImage),
            cotisationAJour: toBoolean(adherentData.CotisationAJour),
          };
        });

        await batchAddAdherents(db, newAdherents);
        await addLog(db, auth, `Importation en masse de ${adherentsCount} adhérents via CSV.`);

        const logsData = await getLogs(db);
        setLogsAdmin(logsData);

        toast({
          title: "Succès",
          description: `${adherentsCount} adhérents ont été importés avec succès.`,
        });

      } catch (error: any) {
        console.error("CSV Import Error:", error);
        toast({
          variant: 'destructive',
          title: "Erreur d'importation",
          description: error.message || "Impossible d'importer le fichier CSV.",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier.",
      });
      setIsImporting(false);
    };

    reader.readAsText(file, 'UTF-8');
  };
  
  if (loading) {
      return <AdminPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Tableau de bord Administrateur</h1>
        <p className="text-muted-foreground">
          Gérez les accès, consultez l'historique des actions et utilisez les outils IA.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Importer des adhérents</CardTitle>
          <CardDescription>
            Ajoutez plusieurs adhérents en même temps à partir d'un fichier CSV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            aria-label="Importer une liste d'adhérents à partir d'un fichier CSV"
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importer des adhérents via CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileImport}
            disabled={isImporting}
          />
          <p className="text-sm text-muted-foreground mt-4">
            Le fichier CSV doit contenir les colonnes : Prenom, Nom, Email, Telephone, Adresse, DateNaissance, Genre, DateInscription, MembreBureau, Benevole, MembreFAAF, DroitImage, CotisationAJour.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle role="heading" aria-level={2}>Gestion des administrateurs</CardTitle>
            <CardDescription>Ajoutez, modifiez ou supprimez les administrateurs.</CardDescription>
          </div>
          <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Ajouter un nouvel administrateur">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddAdmin}>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel administrateur</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations ci-dessous pour créer un nouvel administrateur.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input id="prenom" name="prenom" value={newAdminData.prenom} onChange={handleInputChange} placeholder="Jean" aria-label="Saisir le prénom du nouvel administrateur" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input id="nom" name="nom" value={newAdminData.nom} onChange={handleInputChange} placeholder="Dupont" aria-label="Saisir le nom de l'administrateur" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={newAdminData.email} onChange={handleInputChange} placeholder="jean.dupont@email.com" aria-label="Saisir l'email de l'administrateur" required />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" name="password" type="password" value={newAdminData.password} onChange={handleInputChange} aria-label="Saisir le mot de passe de l'administrateur, saisie masquée" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Rôle / Poste</Label>
                    <Input id="role" name="role" value={newAdminData.role} onChange={handleInputChange} placeholder="Président" aria-label="Saisir le rôle de l'administrateur" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} aria-label={`Enregistrer le compte administrateur de ${newAdminData.prenom} ${newAdminData.nom}`}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajouter l'administrateur
                  </Button>
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
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {administrateurs.length > 0 ? (
                administrateurs.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.prenom} {admin.nom}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.role || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" aria-label={`Modifier le compte administrateur de ${admin.prenom} ${admin.nom}`} onClick={() => toast({ title: "Action non disponible", description: "La modification n'est pas encore implémentée."})}>
                           <Pencil className="mr-2 h-4 w-4" /> Modifier
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" aria-label={`Supprimer le compte administrateur de ${admin.prenom} ${admin.nom}`}>
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Cette action est irréversible. Elle supprimera définitivement le compte administrateur de
                                    <span className="font-semibold"> {admin.prenom} {admin.nom}</span> de la base de données (mais pas de l'authentification Firebase).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAdmin(admin)}>Continuer</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Aucun administrateur enregistré.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Journal d'audit</CardTitle>
          <CardDescription>Historique des actions réalisées sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Administrateur</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsAdmin.length > 0 ? (
                logsAdmin.map((log) => {
                 const formattedDate = new Date(log.dateAction).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                 const accessibilityLabel = `Le ${formattedDate}, l'administrateur ${log.nomAdmin} a réalisé l'action suivante : ${log.actionRealisee}`;
                 return (
                    <TableRow key={log.id} aria-label={accessibilityLabel}>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell className="font-medium">{log.nomAdmin}</TableCell>
                        <TableCell>{log.actionRealisee}</TableCell>
                    </TableRow>
                 )
                })
              ) : (
                 <TableRow>
                  <TableCell colSpan={3} className="text-center" role="text">Aucune action récente.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
