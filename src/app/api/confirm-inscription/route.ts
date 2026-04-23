import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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

    return NextResponse.json({
      success: true,
      jetonAnnulation,
      eventTitle: event.titre,
      eventDate: formattedDate,
      eventDateFin: formattedDateFin,
      eventLocation: event.lieu,
      eventDescription: event.description || '',
      eventPrix: event.prix ?? 0,
      adherentEmail,
      adherentFirstName,
    });

  } catch (error: any) {
    console.error('Confirm inscription error:', error);
    return NextResponse.json({ success: false, error: error.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}
