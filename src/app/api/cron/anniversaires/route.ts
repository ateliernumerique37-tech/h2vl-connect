import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const maxDuration = 60;

const BIRTHDAY_MESSAGES = [
  "Bonjour [Prenom], toute l'équipe de l'association te souhaite un merveilleux anniversaire ! Que cette journée soit remplie de joie.",
  "Joyeux anniversaire [Prenom] ! Nous te souhaitons le meilleur pour cette nouvelle année. Au plaisir de se voir bientôt à l'association.",
  "C'est un jour spécial ! Bon anniversaire [Prenom]. Profite bien de ta journée, on pense bien à toi.",
  "Un très bel anniversaire à toi [Prenom] ! Merci pour ta présence parmi nous. Santé et bonheur !",
];

function isBirthdayToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  try {
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    return (
      birthDate.getMonth() === today.getMonth() &&
      birthDate.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // ── Vérification du secret ───────────────────────────────────────────────
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Construire l'URL de base pour appeler /api/send-email ────────────────
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host') || 'localhost:9002';
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
  const origin = `${protocol}://${host}`;

  try {
    const db = adminDb();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // ── 1. Lire tous les adhérents ───────────────────────────────────────
    const adherentsSnap = await db.collection('adherents').get();
    const adherents = adherentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as {
      id: string;
      prenom: string;
      nom: string;
      email: string;
      dateNaissance?: string;
    }[];

    // ── 2. Filtrer les anniversaires du jour ─────────────────────────────
    const birthdayAdherents = adherents.filter(a => isBirthdayToday(a.dateNaissance));

    if (birthdayAdherents.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "Aucun anniversaire aujourd'hui." });
    }

    // ── 3. Vérifier les logs pour éviter les doublons ────────────────────
    const logsSnap = await db
      .collection('logs_anniversaires')
      .where('date_envoi', '==', todayStr)
      .get();
    const alreadySentIds = new Set(logsSnap.docs.map(d => d.data().id_adherent as string));

    // ── 4. Envoyer les emails via /api/send-email ────────────────────────
    let sent = 0;
    let errors = 0;

    for (const adherent of birthdayAdherents) {
      if (alreadySentIds.has(adherent.id) || !adherent.email) continue;

      try {
        const randomMsg = BIRTHDAY_MESSAGES[Math.floor(Math.random() * BIRTHDAY_MESSAGES.length)];
        const customMessage = randomMsg.replace('[Prenom]', adherent.prenom);

        const res = await fetch(`${origin}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adherent.email,
            firstName: adherent.prenom,
            adherentId: adherent.id,
            campaignId: 'anniversaire',
            type: 'birthday',
            subject: `Joyeux anniversaire ${adherent.prenom} ! 🎉`,
            customMessage,
          }),
        });

        const result = await res.json();

        if (result.success) {
          // Enregistrer le log anti-doublons
          await db.collection('logs_anniversaires').add({
            id_adherent: adherent.id,
            date_envoi: todayStr,
            statut: 'envoyé',
          });
          sent++;
        } else {
          console.error(`Échec send-email pour ${adherent.email}:`, result.error);
          errors++;
        }
      } catch (err) {
        console.error(`Erreur anniversaire pour ${adherent.email}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      errors,
      message: `${sent} email(s) envoyé(s), ${errors} erreur(s).`,
    });

  } catch (error: any) {
    console.error('Cron anniversaires error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
