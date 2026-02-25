'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    if (!db) {
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "La base de données n'est pas initialisée.",
        });
        setIsLoading(false);
        return;
    }

    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Create admin document in Firestore
      const adminRef = doc(db, "admins", user.uid);
      await setDoc(adminRef, {
        prenom: firstName,
        nom: lastName,
        email: email,
        role: 'Administrateur', // Default role
      });


      toast({
        title: "Inscription réussie !",
        description: "Votre compte administrateur a été créé et vous êtes maintenant connecté.",
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Signup Error:", error);
      
      let descriptiveError = "Une erreur inattendue est survenue. Veuillez réessayer.";
      if (error.code) {
          switch (error.code) {
              case 'auth/email-already-in-use':
                  descriptiveError = "Cette adresse email est déjà utilisée par un autre compte.";
                  break;
              case 'auth/weak-password':
                  descriptiveError = "Le mot de passe est trop faible. Il doit comporter au moins 6 caractères.";
                  break;
              case 'auth/invalid-email':
                  descriptiveError = "L'adresse email n'est pas valide.";
                  break;
              case 'permission-denied':
                  descriptiveError = "Échec de la création du profil. Vérifiez les règles de sécurité Firestore.";
                  break;
              default:
                  descriptiveError = `Erreur : ${error.message} (code: ${error.code})`;
          }
      } else if (error.message) {
          descriptiveError = error.message;
      }

      toast({
        variant: "destructive",
        title: "Échec de l'inscription",
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
          <CardTitle className="text-2xl">Inscription</CardTitle>
          <CardDescription>
            Créez un compte administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">Prénom</Label>
                <Input 
                  id="first-name" 
                  placeholder="Max" 
                  required 
                  autoComplete="given-name" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Nom</Label>
                <Input 
                  id="last-name" 
                  placeholder="Robinson" 
                  required 
                  autoComplete="family-name" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer un compte
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
