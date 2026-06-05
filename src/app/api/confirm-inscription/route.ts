import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

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

function buildCancellationHtml(url: string): string {
  return `
    <p style="margin:28px 0 0;padding-top:20px;border-top:1px dashed #e5e7eb;font-size:13px;color:#6b7280;">
      Un imprévu ? Vous pouvez annuler votre inscription à tout moment :<br>
      <a href="${url}" style="color:#dc2626;text-decoration:underline;">Annuler mon inscription</a>
    </p>`;
}

export async function POST(request: Request) {
  try {
    const { jeton, menuChoices, bowlingChoices } = await request.json();

    if (!jeton) {
      return NextResponse.json({ success: false, error: 'MISSING_TOKEN' }, { status: 400 });
    }

    const db = adminDb();

    // 1. Lire l'invitation
    const invitationRef = db.collection('invitations_evenement').doc(jeton);
    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const invitation = invitationSnap.data()!;

    if (invitation.statut === 'inscrit') {
      return NextResponse.json({ success: false, error: 'ALREADY_REGISTERED' }, { status: 409 });
    }

    const { evenementId, adherentId, adherentEmail, adherentFirstName } = invitation;

    // 2. Lire l'événement
    const eventSnap = await db.collection('evenements').doc(evenementId).get();
    if (!eventSnap.exists) {
      return NextResponse.json({ success: false, error: 'EVENT_NOT_FOUND' }, { status: 404 });
    }

    const event = eventSnap.data()!;

    // 3. Vérifier si les inscriptions sont fermées
    const now = new Date();
    if (new Date(event.date) < now) {
      return NextResponse.json({ success: false, error: 'REGISTRATION_CLOSED' }, { status: 409 });
    }
    if (event.dateLimiteInscription && new Date(event.dateLimiteInscription) < now) {
      return NextResponse.json({ success: false, error: 'REGISTRATION_CLOSED' }, { status: 409 });
    }

    // 4. Vérifier la capacité
    if (event.nombrePlacesMax && event.nombrePlacesMax > 0) {
      const allInscriptionsSnap = await db.collection('inscriptions')
        .where('id_evenement', '==', evenementId)
        .get();
      if (allInscriptionsSnap.size >= event.nombrePlacesMax) {
        return NextResponse.json({ success: false, error: 'EVENT_FULL' }, { status: 409 });
      }
    }

    // 5. Vérifier doublon
    const existingSnap = await db.collection('inscriptions')
      .where('id_evenement', '==', evenementId)
      .where('id_adherent', '==', adherentId)
      .get();

    if (!existingSnap.empty) {
      await invitationRef.update({ statut: 'inscrit', dateInscription: now.toISOString() });
      return NextResponse.json({ success: false, error: 'ALREADY_REGISTERED' }, { status: 409 });
    }

    // 6. Créer l'inscription
    const inscriptionDate = now.toISOString();
    const inscriptionData: Record<string, unknown> = {
      id_evenement: evenementId,
      id_adherent: adherentId,
      a_paye: false,
      date_inscription: inscriptionDate,
    };
    if (menuChoices) inscriptionData.choixMenu = menuChoices;
    if (bowlingChoices) inscriptionData.choixBowling = bowlingChoices;

    const inscriptionRef = await db.collection('inscriptions').add(inscriptionData);

    // 7. Créer le jeton d'annulation
    const jetonAnnulation = crypto.randomUUID();
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
    const formattedDate = fmt(event.date);
    const formattedDateFin = event.dateFin ? fmt(event.dateFin) : null;

    await db.collection('annulations_inscription').doc(jetonAnnulation).set({
      inscriptionId: inscriptionRef.id,
      evenementId,
      eventTitle: event.titre || '',
      eventDate: formattedDate,
      eventDateFin: formattedDateFin,
      jetonInvitation: jeton,
      utilisé: false,
      createdAt: inscriptionDate,
    });

    // 8. Marquer l'invitation comme traitée
    await invitationRef.update({ statut: 'inscrit', dateInscription: inscriptionDate });

    // 9. Envoyer l'email de confirmation directement (best-effort)
    if (adherentEmail) {
      try {
        const forwardedProto = request.headers.get('x-forwarded-proto');
        const host = request.headers.get('host') || 'localhost:9002';
        const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
        const origin = `${protocol}://${host}`;
        const annulationUrl = `${origin}/lien/annulation/${jetonAnnulation}`;

        // Tracking email (best-effort)
        const trackingJeton = crypto.randomUUID();
        try {
          await db.collection('email_tracking').doc(trackingJeton).set({
            adherentId,
            campagneId: `inscription_${evenementId}`,
            statut: 'envoyé',
            dateEnvoi: new Date().toISOString(),
            dateLecture: null,
          });
        } catch (trackingError) {
          console.error('Erreur tracking email confirmation:', trackingError);
        }

        const confirmationUrl = `${origin}/lien/confirmation/${trackingJeton}`;
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

        const prixLabel = Number(event.prix) > 0 ? `${Number(event.prix).toFixed(2)} €` : 'Gratuit';

        const headerContent = `
          <p style="margin:16px 0 4px;font-size:19px;font-weight:bold;color:#ffffff;">✅ Inscription confirmée</p>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${escapeHtml(event.titre)}</p>`;

        const body = `
          <p style="margin:0 0 6px;font-size:16px;">Bonjour <strong>${escapeHtml(adherentFirstName || '')}</strong>,</p>
          <p style="margin:0 0 ${event.description ? '16px' : '24px'};font-size:15px;color:#4b5563;line-height:1.7;">
            Votre inscription est bien enregistrée. Nous avons hâte de vous retrouver !
          </p>
          ${event.description ? `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">${escapeHtml(event.description)}</p>` : ''}
          <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#1f2937;">Récapitulatif</p>
          <ul style="margin:0 0 8px;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
            <li>📅 <strong>Début :</strong> ${formattedDate}</li>
            ${formattedDateFin ? `<li>🏁 <strong>Fin :</strong> ${formattedDateFin}</li>` : ''}
            <li>📍 <strong>Lieu :</strong> ${escapeHtml(event.lieu || '')}</li>
            <li>💶 <strong>Tarif :</strong> ${prixLabel}</li>
          </ul>
          ${buildMenuChoicesHtml(menuChoices)}
          ${buildBowlingChoicesHtml(bowlingChoices)}
          ${buildCancellationHtml(annulationUrl)}
          ${readReceiptBlock}`;

        const html = emailWrapper('#15803d', headerContent, body);

        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT),
          secure: process.env.EMAIL_PORT === '465',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          connectionTimeout: 10000,
        });
        try {
          await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'H2VL'}" <${process.env.EMAIL_USER}>`,
            to: adherentEmail,
            subject: `Confirmation d'inscription : ${event.titre}`,
            html,
          });
        } finally {
          transporter.close();
        }
      } catch (emailError) {
        // L'email est best-effort : l'inscription reste valide même si l'email échoue
        console.error('Erreur envoi email confirmation:', emailError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Confirm inscription error:', error);
    return NextResponse.json({ success: false, error: error.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}
