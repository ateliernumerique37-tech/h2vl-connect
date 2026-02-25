import Link from "next/link";
import Image from "next/image";
import type { Evenement } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Euro } from "lucide-react";

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

  return (
    <Link 
      href={`/dashboard/events/${event.id}`} 
      className="group block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label={`Voir les détails pour l'événement ${event.titre}`}
    >
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-[3/2] w-full">
            {placeholder && (
              <Image
                src={placeholder.imageUrl}
                alt={placeholder.description}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint={placeholder.imageHint}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <CardTitle className="mb-2 text-xl">{event.titre}</CardTitle>
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
              <span>{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <div className="w-full rounded-md border border-input bg-background px-4 py-2 text-center text-sm font-medium text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground" aria-hidden="true">
            Voir les détails
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
