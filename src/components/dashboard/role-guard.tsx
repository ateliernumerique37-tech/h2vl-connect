'use client';

import { ShieldOff } from 'lucide-react';
import { useAdminRole, type AdminRole } from '@/contexts/admin-role-context';

interface RoleGuardProps {
  requiredRole?: AdminRole;
  children: React.ReactNode;
}

/**
 * Composant de garde basé sur le rôle.
 * Affiche un message d'accès restreint si l'admin connecté n'a pas le rôle requis.
 * Par défaut, requiert le rôle "Administrateur".
 */
export function RoleGuard({ requiredRole = 'Administrateur', children }: RoleGuardProps) {
  const role = useAdminRole();

  if (role !== requiredRole) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center p-8"
        role="alert"
        aria-live="polite"
      >
        <ShieldOff className="h-16 w-16 text-muted-foreground/40" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Accès restreint</h1>
        <p className="text-muted-foreground max-w-md">
          Les données des adhérents sont confidentielles et accessibles uniquement aux
          Administrateurs, conformément au RGPD.
        </p>
        <p className="text-sm text-muted-foreground">
          Contactez un Administrateur si vous avez besoin d'accéder à ces informations.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
