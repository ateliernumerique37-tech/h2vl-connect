import Link from "next/link";
import Image from "next/image";
import type { Evenement } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Calendar, MapPin, Euro, ChevronRight } from "lucide-react";

type EventCardProps = {
  event: Evenement;
};

export function EventCard({ event }: EventCardProps) {
  const placeholder = PlaceHolderImages.find(p => p.id === event.imageId);

  const formattedDate = new Date(event.date).toLocaleDateString("fr-FR", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prixLabel = event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit";

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="group block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {/* ── Mobile / tablette : mise en page carte ─────────────────────── */}
      <Card className="lg:hidden flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-lg">
        <div className="relative aspect-[3/2] w-full" aria-hidden="true">
          {placeholder && (
            <Image
              src={placeholder.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
        </div>
        <CardContent className="flex-1 p-4">
          <h3 className="mb-2 text-xl font-semibold leading-tight">{event.titre}</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{event.lieu}</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{prixLabel}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <div
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-center text-sm font-medium text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground"
            aria-hidden="true"
          >
            Voir les détails
          </div>
        </CardFooter>
      </Card>

      {/* ── Desktop : mise en page ligne ────────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-6 rounded-lg border bg-card px-5 py-4 transition-colors group-hover:bg-muted/50 group-hover:border-primary/30 group-focus-visible:bg-muted/50">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground">{event.titre}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
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
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      </div>
    </Link>
  );
}
