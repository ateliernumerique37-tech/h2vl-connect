'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

  useEffect(() => {
    if (user && db) {
      const healPhantomAdmin = async () => {
        const adminRef = doc(db, 'admins', user.uid);
        try {
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            // This is a phantom user, their auth account exists but not their DB record.
            // Let's create it. The security rules should allow this (isOwner).
            const emailName = user.email ? user.email.split('@')[0] : 'Admin';
            await setDoc(adminRef, {
              prenom: emailName,
              nom: '',
              email: user.email,
              role: 'Administrateur',
            });
          }
        } catch (error) {
          console.error("AuthGuard: Failed to check/heal phantom admin user.", error);
        }
      };

      healPhantomAdmin();
    }
  }, [user, db]);

  if (isUserLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    router.replace('/login');
    return null; 
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
