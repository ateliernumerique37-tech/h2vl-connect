import { EventCard } from "@/components/event-card";
import { evenements as allEvents } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Événements à venir</h1>
          <p className="text-muted-foreground">
            Découvrez et inscrivez-vous à nos prochains événements.
          </p>
        </div>
        <Button
            aria-label="Créer un nouvel événement"
        >
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Créer un événement
        </Button>
      </div>

       {allEvents.length === 0 ? (
         <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">Aucun événement pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
