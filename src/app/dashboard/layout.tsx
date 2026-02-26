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
                <Skeleton className="h-8 w-32 mb-8" />
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </div>
            <div className="flex-1 p-8">
                 <Skeleton className="h-8 w-64 mb-4" />
                 <Skeleton className="h-[200px] w-full" />
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
    // Si l'utilisateur est authentifié mais que son profil n'existe pas en DB, on le crée.
    if (user && db && !isAdminDocLoading && !isHealing && !adminDoc && !adminError) {
      setIsHealing(true);
      const emailName = user.email ? user.email.split('@')[0] : 'Admin';
      
      setDoc(doc(db, 'admins', user.uid), {
        prenom: emailName,
        nom: '',
        email: user.email,
        role: 'Administrateur',
      }, { merge: true }).finally(() => {
        // Le listener useDoc se chargera de mettre à jour adminDoc et donc d'arrêter isHealing
      });
    }
  }, [user, db, adminDoc, isAdminDocLoading, isHealing, adminError]);

  useEffect(() => {
    if (adminDoc && isHealing) setIsHealing(false);
  }, [adminDoc, isHealing]);

  // Si on a une erreur de permission sur son propre doc admins/UID, on est probablement en train d'initialiser
  if (isUserLoading || isAdminDocLoading || isHealing || (adminError && !isHealing)) {
    return <DashboardSkeleton />;
  }

  if (!user) return null;

  // Si on est reconnu comme admin, on affiche le contenu
  if (adminDoc) return <>{children}</>;

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
