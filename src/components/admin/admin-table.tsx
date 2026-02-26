'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ShieldAlert } from "lucide-react";
import type { Admin } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminTableProps {
  admins: Admin[];
  currentUserId: string | undefined;
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
}

export function AdminTable({ admins, currentUserId, onEdit, onDelete }: AdminTableProps) {
  const getRoleBadge = (role: Admin['role']) => {
    switch (role) {
      case 'Super Admin':
        return <Badge variant="default" className="bg-primary">{role}</Badge>;
      case 'Administrateur':
        return <Badge variant="secondary">{role}</Badge>;
      case 'Éditeur':
        return <Badge variant="outline">{role}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="rounded-md border overflow-hidden">
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
          {admins.map((admin) => {
            const isSelf = admin.id === currentUserId;

            return (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  {admin.prenom} {admin.nom}
                  {isSelf && <span className="ml-2 text-xs text-muted-foreground italic">(Moi)</span>}
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>{getRoleBadge(admin.role)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(admin)}
                      aria-label={`Modifier le compte de ${admin.prenom} ${admin.nom}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={isSelf}
                          aria-label={`Supprimer le compte de ${admin.prenom} ${admin.nom}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le compte de <strong>{admin.prenom} {admin.nom}</strong> ? Cette action est irréversible et supprimera son accès à l'application.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(admin)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Confirmer la suppression
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
