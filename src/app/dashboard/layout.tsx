
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

function DashboardSkeleton() {
    return (
        <div className="flex h-screen w-full">
            <div className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
                <div className="mb-8 flex items-center gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </div>
            <div className="flex flex-1 flex-col">
                <header className="flex h-14 items-center justify-end gap-4 border-b bg-background px-6">
                    <Skeleton className="h-8 w-8 rounded-full" />
                </header>
                <main className="flex-1 p-8">
                     <Skeleton className="h-8 w-64 mb-4" />
                     <Skeleton className="h-4 w-96 mb-8" />
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                     </div>
                </main>
            </div>
        </div>
    )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  const adminRef = useMemoFirebase(() => user ? doc(db, 'admins', user.uid) : null, [db, user]);
  const { data: adminDoc, isLoading: isAdminDocLoading, error: adminError } = useDoc(adminRef);
  const [isHealing, setIsHealing] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Audit: Auto-réparation sécurisée du profil admin manquant
    // On ne lance la réparation que si le chargement initial est fini et qu'aucun doc n'est trouvé
    if (user && db && !isAdminDocLoading && !isHealing && !adminDoc && !adminError) {
      setIsHealing(true);
      const emailName = user.email ? user.email.split('@')[0] : 'Admin';
      
      setDoc(doc(db, 'admins', user.uid), {
        prenom: emailName,
        nom: '',
        email: user.email,
        role: 'Administrateur',
      }).finally(() => {
        // On reste en état "isHealing" jusqu'à ce que le listener useDoc détecte le nouveau document
      });
    }
  }, [user, db, adminDoc, isAdminDocLoading, isHealing, adminError]);

  // Fin de la réparation dès que le document admin apparaît
  useEffect(() => {
    if (adminDoc && isHealing) {
      setIsHealing(false);
    }
  }, [adminDoc, isHealing]);

  // IMPORTANT: On attend que TOUT soit prêt avant d'afficher les enfants (qui font des requêtes Firestore)
  if (isUserLoading || isAdminDocLoading || isHealing || (!adminDoc && !adminError)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Si on a un document admin, on est autorisé
  if (adminDoc) {
    return <>{children}</>;
  }

  // Si après chargement et tentative de réparation, on n'a toujours pas de doc (ex: erreur de permission)
  // On affiche le skeleton pour éviter le crash en attendant une résolution
  return <DashboardSkeleton />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AuthGuard>
        <SidebarProvider>
          <Sidebar>
            <SidebarNav />
          </Sidebar>
          <SidebarInset className="flex flex-col">
            <DashboardHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" role="main">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
  );
}
