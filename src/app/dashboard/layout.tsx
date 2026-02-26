'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Composant de chargement sémantique pour éviter les sauts visuels.
 */
function DashboardSkeleton() {
    return (
        <div className="flex h-screen w-full" aria-hidden="true">
            <div className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
                <Skeleton className="h-8 w-32 mb-8" />
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </div>
            <div className="flex-1 p-8">
                 <Skeleton className="h-8 w-64 mb-6" />
                 <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
        </div>
    )
}

/**
 * Garde d'authentification et de profil.
 * Gère la redirection, l'auto-réparation du profil et prévient les erreurs d'hydratation.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  // Montage client
  useEffect(() => {
    setMounted(true);
  }, []);

  const adminRef = useMemoFirebase(() => user ? doc(db, 'admins', user.uid) : null, [db, user]);
  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRef);
  const [isHealing, setIsHealing] = useState(false);

  // 1. Redirection si non connecté (uniquement après montage pour éviter les flashs)
  useEffect(() => {
    if (mounted && !isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router, mounted]);

  // 2. Auto-réparation du profil admin si manquant
  useEffect(() => {
    if (mounted && user && db && !isAdminDocLoading && !adminDoc && !isHealing) {
      setIsHealing(true);
      const emailName = user.email ? user.email.split('@')[0] : 'Admin';
      
      setDoc(doc(db, 'admins', user.uid), {
        prenom: emailName,
        nom: '',
        email: user.email,
        role: 'Administrateur',
      }, { merge: true })
      .catch((error) => {
        console.error("Auto-repair failed:", error);
      })
      .finally(() => {
        setIsHealing(false);
      });
    }
  }, [user, db, adminDoc, isAdminDocLoading, isHealing, mounted]);

  // Chargement / Attente Hydratation
  // Prévient le mismatch serveur/client en forçant le squelette lors de la première passe client
  if (!mounted || isUserLoading || isAdminDocLoading || isHealing) {
    return <DashboardSkeleton />;
  }

  // Sécurité ultime : ne rien rendre si l'utilisateur n'est finalement pas authentifié
  if (!user) return null;

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
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" role="main">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
  );
}
