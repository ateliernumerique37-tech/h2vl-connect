'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/firebase";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login Error:", error);
      
      let descriptiveError = "Une erreur inattendue est survenue. Veuillez réessayer.";
      if (error.code) {
          switch (error.code) {
              case 'auth/user-not-found':
              case 'auth/wrong-password':
              case 'auth/invalid-credential':
                  descriptiveError = "Identifiants incorrects. Veuillez vérifier votre email et mot de passe.";
                  break;
              case 'auth/too-many-requests':
                  descriptiveError = "Accès temporairement désactivé en raison de trop nombreuses tentatives. Réessayez plus tard.";
                  break;
              default:
                  descriptiveError = `Erreur : ${error.message} (code: ${error.code})`;
          }
      } else if (error.message) {
          descriptiveError = error.message;
      }

      toast({
        variant: "destructive",
        title: "Échec de la connexion",
        description: descriptiveError,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Entrez votre email ci-dessous pour vous connecter à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Saisissez l'adresse email de votre compte administrateur"
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto inline-block text-sm underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Mot de passe oublié ?"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Saisissez votre mot de passe, saisie masquée"
                maxLength={100}
              />
            </div>
            <Button type="submit" className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={isLoading} aria-label="Valider la connexion à l'espace H2vl">
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Vous n'avez pas de compte ?{" "}
            <Link href="/signup" className="underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              S'inscrire
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
