import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
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

function buildBirthdayHtml(prenom: string, customMessage: string): string {
  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1A75D1; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Joyeux Anniversaire ! 🎂</h1>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #1e40af; font-weight: bold;">Bonjour ${prenom},</p>
        <p style="font-size: 16px; color: #333;">${customMessage}</p>
        <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #eee; text-align: center;">
          <p style="font-size: 14px; color: #666;">
            Cordialement,<br/>
            <strong>EVA</strong>, la petite mascotte de H2VL qui veille sur vous ✨
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  // ── Vérification du secret ───────────────────────────────────────────────
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // ── 4. Configurer Nodemailer ─────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
    });

    // ── 5. Envoyer les emails ────────────────────────────────────────────
    let sent = 0;
    let errors = 0;

    for (const adherent of birthdayAdherents) {
      if (alreadySentIds.has(adherent.id) || !adherent.email) continue;

      try {
        const randomMsg = BIRTHDAY_MESSAGES[Math.floor(Math.random() * BIRTHDAY_MESSAGES.length)];
        const customMessage = randomMsg.replace('[Prenom]', adherent.prenom);

        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || 'H2VL'}" <${process.env.EMAIL_USER}>`,
          to: adherent.email,
          subject: `Joyeux anniversaire ${adherent.prenom} ! 🎉`,
          html: buildBirthdayHtml(adherent.prenom, customMessage),
        });

        // Enregistrer le log pour éviter les doublons
        await db.collection('logs_anniversaires').add({
          id_adherent: adherent.id,
          date_envoi: todayStr,
          statut: 'envoyé',
        });

        sent++;
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
