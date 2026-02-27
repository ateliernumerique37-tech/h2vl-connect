'use client';
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@/firebase";
import { LogOut } from "lucide-react";

export function UserNav() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Déconnexion réussie" });
      router.push('/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "La déconnexion a échoué." });
    }
  };
  
  const identite = user?.displayName || user?.email || "Admin";

  return (
    <Button 
      variant="outline" 
      onClick={handleLogout}
      className="focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] flex items-center gap-2"
      aria-label="Se déconnecter de la session"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Se déconnecter ({identite})</span>
      <span className="sm:hidden">Déconnexion</span>
    </Button>
  );
}
