'use client';

import { useState } from "react";
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
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { administrateurs as mockAdmins, logsAdmin as mockLogs } from "@/lib/placeholder-data";
import type { Admin, LogAdmin } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function AdminPage() {
  const [administrateurs, setAdministrateurs] = useState<Admin[]>(mockAdmins);
  const [logsAdmin, setLogsAdmin] = useState<LogAdmin[]>(mockLogs);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);

  // This would be replaced by a server action
  const handleAddAdmin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newAdmin: Admin = {
      id: `admin-${new Date().getTime()}`,
      nom: formData.get('nom') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
    };
    setAdministrateurs(prev => [...prev, newAdmin]);
    setIsAddAdminDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>Tableau de bord Administrateur</h1>
        <p className="text-muted-foreground">
          Gérez les accès et consultez l'historique des actions.
        </p>
      </header>

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
                    <Label htmlFor="nom">Nom</Label>
                    <Input id="nom" name="nom" placeholder="Jean Dupont" aria-label="Saisir le nom de l'administrateur" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="jean.dupont@email.com" aria-label="Saisir l'email de l'administrateur" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Rôle / Poste</Label>
                    <Input id="role" name="role" placeholder="Président" aria-label="Saisir le rôle de l'administrateur" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Ajouter l'administrateur</Button>
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
                    <TableCell className="font-medium">{admin.nom}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.role || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" aria-label={`Modifier le compte administrateur de ${admin.nom}`}>
                           <Pencil className="mr-2 h-4 w-4" /> Modifier
                          </Button>
                          <Button variant="destructive" size="sm" aria-label={`Supprimer le compte administrateur de ${admin.nom}`}>
                           <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </Button>
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
                  <TableCell colSpan={3} className="text-center">Aucun log disponible.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
