import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase-admin';

const BRAND_BLUE      = '#1A75D1';
const BRAND_BLUE_DARK = '#1558A8';

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
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Configuration SMTP incomplète : ${missingVars.join(', ')}`
      }, { status: 500 });
    }

    const {
      to, firstName, adherentId, eventId,
      eventTitle, eventDate, eventDateFin, eventLocation, eventPrix,
      necessiteMenu, estSortieBowling,
    } = await request.json();

    if (!to || !adherentId || !eventId) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
    }

    const jeton = crypto.randomUUID();
    const dateEnvoi = new Date().toISOString();

    const db = adminDb();
    await db.collection('invitations_evenement').doc(jeton).set({
      evenementId: eventId,
      eventTitle: eventTitle || '',
      adherentId,
      adherentEmail: to,
      adherentFirstName: firstName || '',
      statut: 'envoyé',
      dateEnvoi,
      dateInscription: null,
    });

    const forwardedProto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('host') || 'localhost:9002';
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;
    const inscriptionUrl = `${origin}/lien/inscription-invitation/${jeton}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
    });

    const prixLabel = Number(eventPrix) > 0 ? `${Number(eventPrix).toFixed(2)} €` : 'Gratuit';
    const needsChoices = necessiteMenu || estSortieBowling;
    const ctaExplainer = needsChoices
      ? 'En quelques clics, faites vos choix et confirmez votre participation.'
      : 'Un seul clic suffit — votre place sera confirmée immédiatement.';

    const body = `
      <h2 style="margin:0 0 20px;font-size:21px;color:#1f2937;">Vous êtes invité(e) !</h2>

      <p style="margin:0 0 6px;font-size:16px;color:#1f2937;">Bonjour <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
        Nous avons le plaisir de vous convier à notre prochain événement.
      </p>

      <p style="margin:0 0 10px;font-size:17px;font-weight:bold;color:${BRAND_BLUE_DARK};">${eventTitle}</p>
      <ul style="margin:0 0 28px;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
        <li>📅 <strong>Début :</strong> ${eventDate}</li>
        ${eventDateFin ? `<li>🏁 <strong>Fin :</strong> ${eventDateFin}</li>` : ''}
        <li>📍 <strong>Lieu :</strong> ${eventLocation}</li>
        <li>💶 <strong>Tarif :</strong> ${prixLabel}</li>
      </ul>

      <p style="margin:0 0 16px;font-size:15px;color:#4b5563;">${ctaExplainer}</p>

      <p style="margin:0 0 28px;">
        <a href="${inscriptionUrl}"
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
      to,
      subject: `Invitation : ${eventTitle}`,
      html: emailWrapper(body),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('API Invitation Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || "Erreur lors de l'envoi de l'invitation."
    }, { status: 500 });
  }
}
