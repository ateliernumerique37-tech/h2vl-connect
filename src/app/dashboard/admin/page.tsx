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
import { administrateurs, logsAdmin } from "@/lib/placeholder-data";

export default function AdminPage() {
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
          <Button aria-label="Ajouter un nouvel administrateur">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un admin
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {administrateurs.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.nom}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" aria-label={`Modifier les permissions de ${admin.nom}`}>
                           <Pencil className="mr-2 h-4 w-4" /> Modifier
                        </Button>
                        <Button variant="destructive" size="sm" aria-label={`Supprimer l'administrateur ${admin.nom}`}>
                           <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
              {logsAdmin.map((log) => {
                 const formattedDate = new Date(log.dateAction).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                 const accessibilityLabel = `Le ${formattedDate}, l'administrateur ${log.nomAdmin} a réalisé l'action suivante : ${log.actionRealisee}`;
                 return (
                    <TableRow key={log.id} aria-label={accessibilityLabel}>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell className="font-medium">{log.nomAdmin}</TableCell>
                        <TableCell>{log.actionRealisee}</TableCell>
                    </TableRow>
                 )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
