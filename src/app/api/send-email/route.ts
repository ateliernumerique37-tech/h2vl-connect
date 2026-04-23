import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const BRAND_BLUE      = '#1A75D1';
const BRAND_BLUE_DARK = '#1558A8';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Structure commune ──────────────────────────────────────────────────────────

function emailWrapper(headerBg: string, headerContent: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:${headerBg};padding:28px 32px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">H2VL</p>
            <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.80);">Handicap Visuel Val de Loire</p>
            ${headerContent}
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;font-family:Arial,sans-serif;color:#1f2937;">
            ${body}
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

// ── Helpers choix ──────────────────────────────────────────────────────────────

const MENU_LABELS: Record<string, string> = {
  aperitifChoisi: 'Apéritif',
  entreeChoisie:  'Entrée',
  platChoisi:     'Plat principal',
  fromageChoisi:  'Fromage',
  dessertChoisi:  'Dessert',
};
const MENU_ORDER = ['aperitifChoisi', 'entreeChoisie', 'platChoisi', 'fromageChoisi', 'dessertChoisi'];

function buildMenuChoicesHtml(choices: Record<string, string> | undefined | null): string {
  if (!choices) return '';
  const items = MENU_ORDER.filter(key => choices[key]);
  if (!items.length) return '';
  return `
    <p style="margin:24px 0 8px;font-size:15px;font-weight:bold;color:${BRAND_BLUE_DARK};">🍽️ Vos choix de menu</p>
    <ul style="margin:0 0 8px;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
      ${items.map(key => `<li><strong>${MENU_LABELS[key]} :</strong> ${escapeHtml(choices[key])}</li>`).join('')}
    </ul>`;
}

function buildBowlingChoicesHtml(choices: Record<string, boolean> | undefined | null): string {
  if (!choices) return '';
  const items: string[] = [];
  if (choices.avecBarrieres) items.push('Avec barrières');
  if (choices.sansBarrieres)  items.push('Sans barrières');
  if (choices.prendGouter)    items.push("Goûter de l'amitié");
  if (!items.length) return '';
  return `
    <p style="margin:24px 0 8px;font-size:15px;font-weight:bold;color:#92400e;">🎳 Vos options bowling</p>
    <ul style="margin:0 0 8px;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
      ${items.map(i => `<li>${i}</li>`).join('')}
    </ul>`;
}

function buildCancellationHtml(url: string | undefined | null): string {
  if (!url) return '';
  return `
    <p style="margin:28px 0 0;padding-top:20px;border-top:1px dashed #e5e7eb;font-size:13px;color:#6b7280;">
      Un imprévu ? Vous pouvez annuler votre inscription à tout moment :<br>
      <a href="${url}" style="color:#dc2626;text-decoration:underline;">Annuler mon inscription</a>
    </p>`;
}

// Initialisation Firebase côté serveur
function getDb() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
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

    const data = await request.json();
    const {
      to, firstName, adherentId, campaignId, type,
      customMessage, subject: providedSubject,
      eventTitle, eventDate, eventDateFin, eventLocation, eventPrix, eventDescription,
      campaignSubject, campaignBody,
      menuChoices, bowlingChoices, annulationUrl,
    } = data;

    if (!to) {
      return NextResponse.json({ success: false, error: 'Destinataire manquant.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
    });

    const jeton = crypto.randomUUID();
    const dateEnvoi = new Date().toISOString();

    if (adherentId) {
      try {
        const db = getDb();
        await setDoc(doc(db, 'email_tracking', jeton), {
          adherentId,
          campagneId: campaignId || 'direct',
          statut: 'envoyé',
          dateEnvoi,
          dateLecture: null,
        });
      } catch (fsError) {
        console.error('Firestore tracking error:', fsError);
      }
    }

    const forwardedProto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('host') || 'localhost:9002';
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;
    const confirmationUrl = `${origin}/lien/confirmation/${jeton}`;

    const readReceiptBlock = `
      <p style="margin:32px 0 12px;padding-top:24px;border-top:2px solid #f3f4f6;font-size:14px;color:#4b5563;text-align:center;">
        Aidez-nous à confirmer la bonne réception de cet e-mail :
      </p>
      <p style="margin:0;text-align:center;">
        <a href="${confirmationUrl}"
          style="display:inline-block;padding:12px 28px;background-color:${BRAND_BLUE};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
          J'ai bien reçu cet e-mail ✓
        </a>
      </p>`;

    let html = '';
    let subject = providedSubject || 'H2VL : Message';

    // ── Anniversaire ───────────────────────────────────────────────────────────
    if (type === 'birthday') {
      subject = subject || 'Joyeux Anniversaire ! 🎂';
      const headerContent = `<p style="margin:14px 0 0;font-size:20px;color:#ffffff;">🎂 Joyeux Anniversaire !</p>`;
      const body = `
        <p style="margin:0 0 20px;font-size:16px;">Bonjour <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.8;">${escapeHtml(customMessage || '')}</p>
        ${readReceiptBlock}`;
      html = emailWrapper(BRAND_BLUE, headerContent, body);

    // ── Campagne ───────────────────────────────────────────────────────────────
    } else if (type === 'campaign') {
      subject = campaignSubject || subject;
      const headerContent = `<p style="margin:14px 0 0;font-size:15px;color:rgba(255,255,255,0.90);">Message de l'association</p>`;
      const body = `
        <p style="margin:0 0 20px;font-size:16px;">Bonjour <strong>${firstName}</strong>,</p>
        <div style="font-size:15px;color:#374151;line-height:1.8;white-space:pre-wrap;">${escapeHtml(campaignBody || '')}</div>
        ${readReceiptBlock}`;
      html = emailWrapper(BRAND_BLUE, headerContent, body);

    // ── Confirmation d'inscription ─────────────────────────────────────────────
    } else {
      subject = subject || `Confirmation d'inscription : ${eventTitle}`;
      const prixLabel = Number(eventPrix) > 0 ? `${Number(eventPrix).toFixed(2)} €` : 'Gratuit';

      const headerContent = `
        <p style="margin:16px 0 4px;font-size:19px;font-weight:bold;color:#ffffff;">✅ Inscription confirmée</p>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${eventTitle}</p>`;

      const body = `
        <p style="margin:0 0 6px;font-size:16px;">Bonjour <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 ${eventDescription ? '16px' : '24px'};font-size:15px;color:#4b5563;line-height:1.7;">
          Votre inscription est bien enregistrée. Nous avons hâte de vous retrouver !
        </p>

        ${eventDescription ? `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">${escapeHtml(eventDescription)}</p>` : ''}

        <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#1f2937;">Récapitulatif</p>
        <ul style="margin:0 0 8px;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
          <li>📅 <strong>Début :</strong> ${eventDate}</li>
          ${eventDateFin ? `<li>🏁 <strong>Fin :</strong> ${eventDateFin}</li>` : ''}
          <li>📍 <strong>Lieu :</strong> ${eventLocation}</li>
          <li>💶 <strong>Tarif :</strong> ${prixLabel}</li>
        </ul>

        ${buildMenuChoicesHtml(menuChoices)}
        ${buildBowlingChoicesHtml(bowlingChoices)}
        ${buildCancellationHtml(annulationUrl)}
        ${readReceiptBlock}`;

      html = emailWrapper('#15803d', headerContent, body);
    }

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'H2VL'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('API Email Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || "Erreur lors de l'envoi de l'e-mail."
    }, { status: 500 });
  }
}
