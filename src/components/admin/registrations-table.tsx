import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Inscription } from "@/lib/types";
import { adherents, evenements } from "@/lib/placeholder-data";

type RegistrationsTableProps = {
  data: Inscription[];
};

export function RegistrationsTable({ data }: RegistrationsTableProps) {
  const getAdherentName = (id: string) => {
    const adherent = adherents.find(a => a.id === id);
    return adherent ? `${adherent.prenom} ${adherent.nom}` : "Inconnu";
  };
  
  const getEventTitle = (id: string) => {
    return evenements.find(e => e.id === id)?.titre || "Inconnu";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des inscriptions</CardTitle>
        <CardDescription>
          Liste de toutes les inscriptions aux événements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Événement</TableHead>
              <TableHead>Membre</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Statut du paiement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((inscription) => (
              <TableRow key={inscription.id}>
                <TableCell className="font-medium">{getEventTitle(inscription.id_evenement)}</TableCell>
                <TableCell>{getAdherentName(inscription.id_adherent)}</TableCell>
                <TableCell>{new Date(inscription.date_inscription).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                  <Badge variant={inscription.a_paye ? "default" : "secondary"}>
                    {inscription.a_paye ? "Payé" : "En attente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
