'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Composant de chargement statique pour le rendu initial.
 * Structure HTML simplifiée et stable pour éviter les erreurs d'hydratation.
 */
function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full bg-background" aria-hidden="true">
      <div className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
        <div className="mb-8 h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 md:p-8">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

/**
 * Garde d'authentification et de profil.
 * Gère la redirection, l'auto-réparation du profil et prévient les erreurs d'hydratation.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  // Montage initial du client pour synchronisation SSR/Client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const adminRef = useMemoFirebase(() => user ? doc(db, 'admins', user.uid) : null, [db, user]);
  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRef);
  const [isHealing, setIsHealing] = useState(false);

  // Règle d'or : Ne RIEN rendre sur le serveur pour ce fragment asynchrone
  // Cela évite les mismatches d'hydratation car l'état Auth est inconnu au serveur.
  if (!isMounted) {
    return null;
  }

  // 1. Redirection si non connecté
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // 2. Auto-réparation du profil admin si manquant
  useEffect(() => {
    if (user && db && !isAdminDocLoading && !adminDoc && !isHealing) {
      setIsHealing(true);
      const emailName = user.email ? user.email.split('@')[0] : 'Admin';
      
      setDoc(doc(db, 'admins', user.uid), {
        prenom: emailName,
        nom: '',
        email: user.email,
        role: 'Administrateur',
      }, { merge: true })
      .catch(() => {})
      .finally(() => {
        setIsHealing(false);
      });
    }
  }, [user, db, adminDoc, isAdminDocLoading, isHealing]);

  // Ensuite seulement, gérer la logique de chargement de Firebase Auth
  if (isUserLoading || isAdminDocLoading || isHealing) {
    return <DashboardSkeleton />;
  }

  // Sécurité finale : si l'utilisateur n'est pas authentifié, on ne rend rien (le useEffect redirige)
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
