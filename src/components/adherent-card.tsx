import Link from 'next/link';
import type { Adherent } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AdherentCardProps = {
  adherent: Adherent;
};

export function AdherentCard({ adherent }: AdherentCardProps) {
  const initials = `${adherent.prenom?.[0] ?? ''}${adherent.nom?.[0] ?? ''}`.toUpperCase();
  
  return (
    <Link href={`/dashboard/adherents/${adherent.id}`} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">
      <Card 
        aria-label={`Voir les détails pour ${adherent.prenom} ${adherent.nom}`}
        className="transition-colors hover:bg-muted/50 h-full"
      >
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://picsum.photos/seed/${adherent.id}/40/40`} alt={`Avatar for ${adherent.prenom} ${adherent.nom}`} data-ai-hint="avatar person" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <p className="font-semibold">{adherent.prenom} {adherent.nom}</p>
            <p className="text-sm text-muted-foreground">{adherent.email}</p>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
