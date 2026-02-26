
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
    // Tentative d'auto-réparation si le document admin est manquant ou si on a une erreur de permission initiale
    if (user && db && !isAdminDocLoading && !isHealing && (!adminDoc || adminError)) {
      setIsHealing(true);
      const emailName = user.email ? user.email.split('@')[0] : 'Admin';
      
      setDoc(doc(db, 'admins', user.uid), {
        prenom: emailName,
        nom: '',
        email: user.email,
        role: 'Administrateur',
      }).then(() => {
        setIsHealing(false);
      }).catch((error) => {
        console.error("AuthGuard: Erreur lors de l'auto-réparation", error);
        setIsHealing(false);
      });
    }
  }, [user, db, adminDoc, isAdminDocLoading, isHealing, adminError]);

  // Si on charge ou qu'on répare, on montre le skeleton
  // On ignore l'adminError temporairement car l'auto-réparation va la résoudre
  if (isUserLoading || isAdminDocLoading || isHealing || (!adminDoc && !adminError)) {
    return <DashboardSkeleton />;
  }

  // Si pas d'utilisateur, le useEffect redirigera vers /login
  if (!user) {
    return null;
  }

  // Si on a toujours une erreur après la tentative de réparation, on affiche le skeleton 
  // pour éviter un crash et laisser le useEffect retenter si besoin
  if (adminError && !adminDoc) {
    return <DashboardSkeleton />;
  }

  return <>{children}</>;
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
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
  );
}
