import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, firstName, eventTitle, eventDate, eventLocation, price, menuChoices } = await request.json();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let menuHtml = '';
    if (menuChoices && Object.values(menuChoices).some(v => v)) {
      menuHtml = `
        <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #1A75D1; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #1A75D1;">Vos choix de menu :</h3>
          <ul style="list-style: none; padding: 0;">
            ${menuChoices.aperitifChoisi ? `<li style="margin-bottom: 8px;"><strong>Apéritif :</strong> ${menuChoices.aperitifChoisi}</li>` : ''}
            ${menuChoices.entreeChoisie ? `<li style="margin-bottom: 8px;"><strong>Entrée :</strong> ${menuChoices.entreeChoisie}</li>` : ''}
            ${menuChoices.platChoisi ? `<li style="margin-bottom: 8px;"><strong>Plat principal :</strong> ${menuChoices.platChoisi}</li>` : ''}
            ${menuChoices.fromageChoisi ? `<li style="margin-bottom: 8px;"><strong>Fromage :</strong> ${menuChoices.fromageChoisi}</li>` : ''}
            ${menuChoices.dessertChoisi ? `<li style="margin-bottom: 8px;"><strong>Dessert :</strong> ${menuChoices.dessertChoisi}</li>` : ''}
          </ul>
        </div>
      `;
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Confirmation d'inscription : ${eventTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1A75D1; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Confirmation d'Inscription</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
            <p>Nous avons le plaisir de vous confirmer votre inscription à l'événement :</p>
            <div style="margin: 25px 0; padding: 20px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
              <h2 style="margin-top: 0; color: #1e40af; font-size: 20px;">${eventTitle}</h2>
              <p style="margin-bottom: 5px;">📅 <strong>Date :</strong> ${eventDate}</p>
              <p style="margin-bottom: 5px;">📍 <strong>Lieu :</strong> ${eventLocation}</p>
              <p style="margin: 0;">💰 <strong>Participation :</strong> ${price > 0 ? `${price.toFixed(2)} €` : 'Gratuit'}</p>
            </div>
            ${menuHtml}
            <p style="margin-top: 30px;">Nous nous réjouissons de vous retrouver pour ce moment de partage !</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 14px; color: #666;">
              Cordialement,<br/>
              <strong>EVA</strong>, la petite mascotte de h2vl qui veille sur vous ✨
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            Ceci est un message automatique de l'association H2VL.
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur Nodemailer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
