import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const {
      evenementId,
      eventTitle,
      eventDate,
      eventDateFin,
      eventLocation,
      eventPrix,
      eventDescription,
      necessiteMenu,
      estSortieBowling,
      recipients,
    }: {
      evenementId: string;
      eventTitle: string;
      eventDate: string;
      eventDateFin?: string;
      eventLocation: string;
      eventPrix: number;
      eventDescription?: string;
      necessiteMenu: boolean;
      estSortieBowling: boolean;
      recipients: Array<{ adherentId: string; adherentEmail: string; adherentFirstName: string }>;
    } = await request.json();

    if (!evenementId || !recipients?.length) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
    }

    const forwardedProto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('host') || 'localhost:9002';
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;

    const db = adminDb();
    const batch = db.batch();
    const createdAt = new Date().toISOString();

    for (const { adherentId, adherentEmail, adherentFirstName } of recipients) {
      const jeton = crypto.randomUUID();

      // Doc dans invitations_evenement (jeton d'inscription)
      batch.set(db.collection('invitations_evenement').doc(jeton), {
        evenementId,
        eventTitle: eventTitle || '',
        adherentId,
        adherentEmail,
        adherentFirstName: adherentFirstName || '',
        statut: 'envoyé',
        dateEnvoi: createdAt,
        dateInscription: null,
      });

      // Doc dans queue_invitations (file d'attente d'envoi)
      batch.set(db.collection('queue_invitations').doc(), {
        evenementId,
        jeton,
        adherentId,
        adherentEmail,
        adherentFirstName: adherentFirstName || '',
        inscriptionUrl: `${origin}/lien/inscription-invitation/${jeton}`,
        eventTitle: eventTitle || '',
        eventDate: eventDate || '',
        eventDateFin: eventDateFin || null,
        eventLocation: eventLocation || '',
        eventPrix: eventPrix ?? 0,
        eventDescription: eventDescription || '',
        necessiteMenu: necessiteMenu || false,
        estSortieBowling: estSortieBowling || false,
        statut: 'en_attente',
        erreur: null,
        createdAt,
        sentAt: null,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, count: recipients.length });
  } catch (error: any) {
    console.error('Queue invitations error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
