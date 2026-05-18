import Link from "next/link";
import type { Evenement } from "@/lib/types";
import { Calendar, MapPin, Euro } from "lucide-react";

type EventCardProps = {
  event: Evenement;
};

export function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prixLabel = event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit";

  return (
    <article className="rounded-lg border bg-card px-5 py-4 transition-colors hover:bg-muted/50 hover:border-primary/30">
      <h2 className="text-base font-semibold leading-tight mb-2">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
        >
          {event.titre}
        </Link>
      </h2>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{formattedDate}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{event.lieu}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Euro className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{prixLabel}</span>
        </span>
      </div>
    </article>
  );
}
