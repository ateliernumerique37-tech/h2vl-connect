import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { inscriptionId, evenementId, eventTitle, eventDate, eventDateFin } = await request.json();

    if (!inscriptionId || !evenementId) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
    }

    const jeton = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const db = adminDb();
    await db.collection('annulations_inscription').doc(jeton).set({
      inscriptionId,
      evenementId,
      eventTitle: eventTitle || '',
      eventDate: eventDate || null,
      eventDateFin: eventDateFin || null,
      utilisé: false,
      createdAt,
    });

    return NextResponse.json({ success: true, jeton }, { status: 200 });
  } catch (error: any) {
    console.error('API create-annulation-token error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur lors de la création du jeton d\'annulation.',
    }, { status: 500 });
  }
}
