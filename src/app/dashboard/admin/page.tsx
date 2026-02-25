import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AiEventForm from "@/components/admin/ai-event-form";
import { MembersTable } from "@/components/admin/members-table";
import { RegistrationsTable } from "@/components/admin/registrations-table";
import { adherents, inscriptions } from "@/lib/placeholder-data";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Administrateur</h1>
        <p className="text-muted-foreground">
          Gérez les membres, les inscriptions et utilisez les outils d'administration.
        </p>
      </div>

      <Tabs defaultValue="ai-tool" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-tool">Outil IA</TabsTrigger>
          <TabsTrigger value="members">Membres</TabsTrigger>
          <TabsTrigger value="registrations">Inscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="ai-tool">
          <AiEventForm />
        </TabsContent>
        <TabsContent value="members">
          <MembersTable data={adherents} />
        </TabsContent>
        <TabsContent value="registrations">
          <RegistrationsTable data={inscriptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
