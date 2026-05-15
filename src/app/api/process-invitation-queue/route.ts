import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BRAND_BLUE = '#1A75D1';
const BRAND_BLUE_DARK = '#1558A8';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:${BRAND_BLUE};padding:28px 32px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:1px;">H2VL</p>
            <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.85);">Handicap Visuel Val de Loire</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;font-family:Arial,sans-serif;color:#1f2937;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;font-family:Arial,sans-serif;">
            <p style="margin:0;font-size:12px;color:#6b7280;">
              <strong style="color:#374151;">H2VL — Handicap Visuel Val de Loire</strong><br>
              Cet e-mail vous a été envoyé car vous êtes membre de l'association.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    // Vérification du token Firebase Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    await adminAuth().verifyIdToken(token);

    const { evenementId, retryErrors } = await request.json();

    if (!evenementId) {
      return NextResponse.json({ success: false, error: 'evenementId manquant.' }, { status: 400 });
    }

    const db = adminDb();

    // Si retryErrors : remettre les items en erreur ET en_cours (run interrompu) à en_attente
    if (retryErrors) {
      const toResetSnap = await db.collection('queue_invitations')
        .where('evenementId', '==', evenementId)
        .where('statut', 'in', ['erreur', 'en_cours'])
        .get();

      if (!toResetSnap.empty) {
        const resetBatch = db.batch();
        toResetSnap.docs.forEach(doc => {
          resetBatch.update(doc.ref, { statut: 'en_attente', erreur: null });
        });
        await resetBatch.commit();
      }
    }

    // Lire tous les items en_attente
    const pendingSnap = await db.collection('queue_invitations')
      .where('evenementId', '==', evenementId)
      .where('statut', '==', 'en_attente')
      .get();

    if (pendingSnap.empty) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    // Marquer tous les items en_cours en une seule passe
    // → toute requête concurrente trouvera 0 items en_attente et s'arrêtera
    const claimBatch = db.batch();
    pendingSnap.docs.forEach(doc => {
      claimBatch.update(doc.ref, { statut: 'en_cours' });
    });
    await claimBatch.commit();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
    });

    let processed = 0;

    try {
      for (let idx = 0; idx < pendingSnap.docs.length; idx++) {
        // Pause avant chaque email sauf le premier
        if (idx > 0) await sleep(800);

        const docSnap = pendingSnap.docs[idx];
        const item = docSnap.data();

        try {
          const prixLabel = Number(item.eventPrix) > 0
            ? `${Number(item.eventPrix).toFixed(2)} €`
            : 'Gratuit';

          const needsChoices = item.necessiteMenu || item.estSortieBowling;
          const ctaExplainer = needsChoices
            ? 'En quelques clics, faites vos choix et confirmez votre participation.'
            : 'Un seul clic suffit — votre place sera confirmée immédiatement.';

          const body = `
            <h2 style="margin:0 0 20px;font-size:21px;color:#1f2937;">Vous êtes invité(e) !</h2>

            <p style="margin:0 0 6px;font-size:16px;color:#1f2937;">Bonjour <strong>${item.adherentFirstName}</strong>,</p>
            <p style="margin:0 0 ${item.eventDescription ? '16px' : '28px'};font-size:15px;color:#4b5563;line-height:1.7;">
              Nous avons le plaisir de vous convier à notre prochain événement.
            </p>

            ${item.eventDescription ? `<p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">${item.eventDescription}</p>` : ''}

            <p style="margin:0 0 10px;font-size:17px;font-weight:bold;color:${BRAND_BLUE_DARK};">${item.eventTitle}</p>
            <ul style="margin:0 0 28px;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
              <li>📅 <strong>Début :</strong> ${item.eventDate}</li>
              ${item.eventDateFin ? `<li>🏁 <strong>Fin :</strong> ${item.eventDateFin}</li>` : ''}
              <li>📍 <strong>Lieu :</strong> ${item.eventLocation}</li>
              <li>💶 <strong>Tarif :</strong> ${prixLabel}</li>
            </ul>

            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;">${ctaExplainer}</p>

            <p style="margin:0 0 28px;">
              <a href="${item.inscriptionUrl}"
                style="display:inline-block;padding:14px 30px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
                Je m'inscris à cet événement →
              </a>
            </p>

            <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
              Ce lien est personnel et nominatif — merci de ne pas le transférer.<br>
              Si vous ne souhaitez pas participer, vous pouvez ignorer cet e-mail.
            </p>
          `;

          await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'H2VL'}" <${process.env.EMAIL_USER}>`,
            to: item.adherentEmail,
            subject: `Invitation : ${item.eventTitle}`,
            html: emailWrapper(body),
          });

          await docSnap.ref.update({
            statut: 'envoyé',
            sentAt: new Date().toISOString(),
            erreur: null,
          });

          processed++;
        } catch (err: any) {
          console.error(`Erreur invitation ${item.adherentEmail}:`, err);
          await docSnap.ref.update({
            statut: 'erreur',
            erreur: err.message || 'Erreur inconnue',
          });
        }
      }
    } finally {
      transporter.close();
    }

    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error('Process invitation queue error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
