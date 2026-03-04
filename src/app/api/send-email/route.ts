
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    // 1. Vérification des variables d'environnement obligatoires
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.error('SMTP Configuration Error: Missing variables:', missingVars.join(', '));
      return NextResponse.json({ 
        success: false, 
        error: `Configuration SMTP incomplète. Variables manquantes : ${missingVars.join(', ')}` 
      }, { status: 500 });
    }

    const data = await request.json();
    const { 
      to, 
      firstName, 
      adherentId,
      campaignId,
      type, 
      customMessage, 
      subject: providedSubject, 
      eventTitle, 
      eventDate, 
      eventLocation, 
      price, 
      menuChoices,
      campaignSubject,
      campaignBody
    } = data;

    if (!to) {
      return NextResponse.json({ success: false, error: "Destinataire manquant." }, { status: 400 });
    }

    // 2. Configuration du transporteur avec timeouts
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000, // 10 secondes
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const { firestore } = initializeFirebase();
    const jeton = crypto.randomUUID();
    const dateEnvoi = new Date().toISOString();

    // 3. Enregistrement du tracking dans Firestore
    if (adherentId) {
      try {
        await setDoc(doc(firestore, 'email_tracking', jeton), {
          jeton,
          adherentId,
          campagneId: campaignId || 'direct',
          statut: 'envoyé',
          dateEnvoi,
          dateLecture: null
        });
      } catch (fsError) {
        console.warn("Firestore Tracking Error (Non-blocking):", fsError);
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://h2vl-connect.web.app';
    const confirmationUrl = `${origin}/public/confirmation/${jeton}`;
    
    let html = '';
    let subject = providedSubject || `H2VL : Message`;

    const commonFooter = `
      <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #eee; text-align: center; font-family: sans-serif;">
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Afin de nous aider à mieux gérer nos communications, merci de confirmer la réception :
        </p>
        <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1A75D1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Accuser réception de cet e-mail
        </a>
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Cordialement,<br/>
          <strong>EVA</strong>, la petite mascotte de h2vl qui veille sur vous ✨
        </p>
      </div>
    `;

    if (type === 'birthday') {
      subject = subject || `Joyeux Anniversaire ! 🎂`;
      html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1A75D1; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Joyeux Anniversaire ! 🎂</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #1e40af; font-weight: bold;">Bonjour ${firstName},</p>
            <p style="font-size: 16px; color: #333;">${customMessage}</p>
            ${commonFooter}
          </div>
        </div>
      `;
    } else if (type === 'campaign') {
      subject = campaignSubject || subject;
      html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1A75D1; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">H2VL : Information</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; font-weight: bold;">Bonjour ${firstName},</p>
            <div style="font-size: 16px; color: #333; white-space: pre-wrap;">${campaignBody}</div>
            ${commonFooter}
          </div>
        </div>
      `;
    } else {
      subject = subject || `Confirmation d'inscription : ${eventTitle}`;
      html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1A75D1; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Confirmation d'Inscription</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
            <div style="margin: 25px 0; padding: 20px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
              <h2 style="margin-top: 0; color: #1e40af; font-size: 20px;">${eventTitle}</h2>
              <p>📅 <strong>Date :</strong> ${eventDate}</p>
              <p>📍 <strong>Lieu :</strong> ${eventLocation}</p>
            </div>
            ${commonFooter}
          </div>
        </div>
      `;
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'H2VL'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    // 4. Envoi effectif
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('API Email Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur lors de l'envoi de l'e-mail." 
    }, { status: 500 });
  }
}
