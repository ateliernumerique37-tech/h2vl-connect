import { EventCard } from "@/components/event-card";
import { evenements as allEvents } from "@/lib/placeholder-data";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Événements à venir</h1>
        <p className="text-muted-foreground">
          Découvrez et inscrivez-vous à nos prochains événements.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
