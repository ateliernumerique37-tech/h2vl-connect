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
    <Card className="flex flex-col overflow-hidden">
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
        <CardTitle className="mb-2 text-xl font-bold">{event.titre}</CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.lieu}</span>
          </div>
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4" />
            <span>{event.prix > 0 ? `${event.prix.toFixed(2)} €` : "Gratuit"}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" variant="outline">
          Voir les détails
        </Button>
      </CardFooter>
    </Card>
  );
}
