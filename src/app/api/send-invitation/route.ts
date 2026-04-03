import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

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

    const { to, firstName, adherentId, eventId, eventTitle, eventDate, eventLocation, eventPrix } = await request.json();

    if (!to || !adherentId || !eventId) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
    }

    const jeton = crypto.randomUUID();
    const dateEnvoi = new Date().toISOString();

    // Enregistrement de l'invitation avant l'envoi
    const db = getDb();
    await setDoc(doc(db, 'invitations_evenement', jeton), {
      evenementId: eventId,
      eventTitle: eventTitle || '',
      adherentId,
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
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
    });

    const prixLabel = Number(eventPrix) > 0 ? `${Number(eventPrix).toFixed(2)} €` : 'Gratuit';

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1A75D1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Invitation à un événement</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
          <p style="font-size: 16px; color: #333;">L'association H2VL vous invite à participer au prochain événement :</p>
          <div style="margin: 25px 0; padding: 20px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
            <h2 style="margin-top: 0; color: #1e40af; font-size: 20px;">${eventTitle}</h2>
            <p style="margin: 8px 0;">📅 <strong>Date :</strong> ${eventDate}</p>
            <p style="margin: 8px 0;">📍 <strong>Lieu :</strong> ${eventLocation}</p>
            <p style="margin: 8px 0;">💶 <strong>Tarif :</strong> ${prixLabel}</p>
          </div>
          <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #eee; text-align: center;">
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              Pour confirmer votre participation, cliquez sur le bouton ci-dessous :
            </p>
            <a href="${inscriptionUrl}" style="display: inline-block; padding: 14px 28px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              ✅ Je confirme mon inscription
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Ce lien est personnel et nominatif. Ne le partagez pas.
            </p>
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Cordialement,<br/>
              <strong>EVA</strong>, la petite mascotte de h2vl qui veille sur vous ✨
            </p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'H2VL'}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Invitation : ${eventTitle}`,
      html,
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
