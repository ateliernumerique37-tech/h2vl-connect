
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.replace('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null; // The effect handles the redirect.
  }

  return (
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
  );
}
