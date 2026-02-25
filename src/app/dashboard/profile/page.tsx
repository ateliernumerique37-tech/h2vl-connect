import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const currentUser = {
    prenom: "Jean",
    nom: "Dupont",
    email: "jean.dupont@email.com",
    telephone: "0612345678",
    date_inscription: "2023-01-15T10:00:00.000Z"
  };
  
  return (
     <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
        <p className="text-muted-foreground">
          Consultez et mettez à jour vos informations personnelles.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informations Personnelles</CardTitle>
          <CardDescription>
            Ces informations sont utilisées pour votre adhésion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">Prénom</Label>
              <Input id="first-name" defaultValue={currentUser.prenom} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nom</Label>
              <Input id="last-name" defaultValue={currentUser.nom} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={currentUser.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" defaultValue={currentUser.telephone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inscription-date">Date d'inscription</Label>
            <Input id="inscription-date" value={new Date(currentUser.date_inscription).toLocaleDateString('fr-FR')} readOnly disabled />
          </div>
        </CardContent>
        <CardContent>
          <Button>Enregistrer les modifications</Button>
        </CardContent>
      </Card>
    </div>
  );
}
