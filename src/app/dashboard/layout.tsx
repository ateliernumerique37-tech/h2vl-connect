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
  
  const adminRef = useMemoFirebase(() => user ? doc(db, 'admins', user.uid) : null, [db, user]);
  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRef);
  const [isHealing, setIsHealing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isMounted, user, isUserLoading, router]);

  useEffect(() => {
    if (isMounted && user && db && !isAdminDocLoading && !adminDoc && !isHealing) {
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
  }, [isMounted, user, db, adminDoc, isAdminDocLoading, isHealing]);

  if (!isMounted) {
    return null;
  }

  if (isUserLoading || isAdminDocLoading || isHealing) {
    return <DashboardSkeleton />;
  }

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
      <div id="top" className="flex min-h-screen w-full flex-col bg-background">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Aller au contenu principal
        </a>
        
        <SidebarProvider>
          <Sidebar>
            <SidebarNav />
          </Sidebar>
          <SidebarInset className="flex flex-col">
            <DashboardHeader />
            <main 
              id="main-content" 
              className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 outline-none focus-visible:ring-2 focus-visible:ring-primary/20" 
              role="main"
              tabIndex={-1}
            >
              {children}
            </main>
            <a 
              href="#top" 
              className="sr-only focus:not-sr-only focus:fixed focus:bottom-4 focus:right-4 focus:z-[100] focus:bg-background focus:border focus:border-primary focus:text-primary focus:px-3 focus:py-2 focus:rounded-full focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Retour en haut de page
            </a>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </AuthGuard>
  );
}
