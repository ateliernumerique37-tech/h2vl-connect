import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getTodayStr(): string {
  // Retourne YYYY-MM-DD en heure de Paris
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function formatEventDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const todayStr = getTodayStr();
    const db = adminDb();

    // 1. Récupérer tous les événements ayant une date limite
    const eventsSnap = await db.collection('evenements').get();
    const eventsToProcess = eventsSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(e => {
        if (!e.dateLimiteInscription) return false;
        const dateLimite = new Date(e.dateLimiteInscription)
          .toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
        return dateLimite === todayStr;
      });

    if (eventsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun événement avec date limite aujourd'hui.",
        sent: 0,
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const event of eventsToProcess) {
      try {
        // Anti-doublon : vérifier si le mail a déjà été envoyé pour cet événement aujourd'hui
        const logRef = db.collection('logs_liste_inscrits').doc(event.id);
        const logSnap = await logRef.get();
        if (logSnap.exists && logSnap.data()?.date_envoi === todayStr) {
          continue;
        }

        // 2. Récupérer les inscriptions de cet événement
        const inscriptionsSnap = await db
          .collection('inscriptions')
          .where('id_evenement', '==', event.id)
          .get();
        const inscriptions = inscriptionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 3. Récupérer les adhérents en parallèle
        const adherentIds = [...new Set(inscriptions.map((i: any) => i.id_adherent as string))];
        const adherentSnaps = await Promise.all(
          adherentIds.map(id => db.collection('adherents').doc(id).get())
        );
        const adherentsMap: Record<string, any> = {};
        adherentSnaps.forEach(snap => {
          if (snap.exists) adherentsMap[snap.id] = snap.data();
        });

        const nbInscrits = inscriptions.length;
        const eventDateStr = formatEventDate(event.date);

        // 4. Construire la liste des inscrits (texte + HTML)
        const lignesTexte: string[] = [];
        const lignesHtml: string[] = [];

        for (const inscription of inscriptions) {
          const adherent = adherentsMap[inscription.id_adherent];
          const nom = adherent
            ? `${adherent.prenom} ${adherent.nom}`
            : 'Adhérent inconnu';

          const extras: string[] = [];

          if (inscription.choixMenu) {
            const m = inscription.choixMenu;
            if (m.aperitifChoisi)  extras.push(`Apéritif : ${m.aperitifChoisi}`);
            if (m.entreeChoisie)   extras.push(`Entrée : ${m.entreeChoisie}`);
            if (m.platChoisi)      extras.push(`Plat : ${m.platChoisi}`);
            if (m.fromageChoisi)   extras.push(`Fromage : ${m.fromageChoisi}`);
            if (m.dessertChoisi)   extras.push(`Dessert : ${m.dessertChoisi}`);
          }

          if (inscription.choixBowling) {
            const b = inscription.choixBowling;
            if (b.avecBarrieres)  extras.push('Avec barrières');
            if (b.sansBarrieres)  extras.push('Sans barrières');
            if (b.prendGouter)    extras.push("Prend le goûter de l'amitié");
          }

          const detailTexte = extras.length > 0 ? ` — ${extras.join(', ')}` : '';
          const detailHtml  = extras.length > 0
            ? ` <span style="color:#555;font-size:13px;">(${extras.join(', ')})</span>`
            : '';

          lignesTexte.push(`• ${nom}${detailTexte}`);
          lignesHtml.push(
            `<li style="margin:4px 0;"><strong>${nom}</strong>${detailHtml}</li>`
          );
        }

        // 5. Composer le sujet et le corps
        const subject = `Liste des inscrits à "${event.titre}"`;

        const bodyTexte = [
          `Bonjour,`,
          ``,
          `La date limite d'inscription à l'événement "${event.titre}" du ${eventDateStr} est atteinte.`,
          ``,
          `Voici la liste des ${nbInscrits} inscrit${nbInscrits > 1 ? 's' : ''} :`,
          ``,
          ...lignesTexte,
          ``,
          `---`,
          `Ce message a été envoyé automatiquement par H2VL Connect.`,
        ].join('\n');

        const bodyHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a56db;margin-bottom:4px;">H2VL Connect</h2>
  <hr style="border:none;border-top:2px solid #e5e7eb;margin-bottom:20px;" />

  <p>Bonjour,</p>
  <p>
    La date limite d'inscription à l'événement
    <strong>"${event.titre}"</strong> du <strong>${eventDateStr}</strong>
    est atteinte.
  </p>

  <h3 style="margin-bottom:8px;">
    Liste des ${nbInscrits} inscrit${nbInscrits > 1 ? 's' : ''}
  </h3>
  <ul style="padding-left:20px;line-height:1.8;">
    ${lignesHtml.join('\n    ')}
  </ul>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin-top:32px;" />
  <p style="font-size:12px;color:#888;">
    Ce message a été envoyé automatiquement par H2VL Connect.
  </p>
</body>
</html>`;

        // 6. Envoyer l'email
        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
          to: 'contact.h2vl@gmail.com',
          subject,
          text: bodyTexte,
          html: bodyHtml,
        });

        // 7. Log anti-doublon
        await logRef.set({
          date_envoi: todayStr,
          eventTitle: event.titre,
          nbInscrits,
          sentAt: new Date().toISOString(),
        });

        sent++;
      } catch (err: any) {
        errors.push(`${event.titre}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, sent, errors });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
