'use client';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">Vos informations de compte administrateur.</p>
      </header>
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center" role="status">
        <p className="text-xl font-medium text-muted-foreground">Page en cours de développement.</p>
        <p className="text-sm text-muted-foreground mt-2">Cette fonctionnalité sera disponible prochainement.</p>
      </div>
    </div>
  );
}
