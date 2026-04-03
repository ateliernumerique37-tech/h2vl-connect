'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// La création de comptes administrateurs se fait depuis le tableau de bord (Administration).
// Un Super Admin crée le compte → l'utilisateur reçoit ses identifiants et se connecte via /login.
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
