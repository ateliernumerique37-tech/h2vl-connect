'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { addInscription } from '@/services/inscriptionsService';
import { CheckCircle2, AlertCircle, Loader2, CalendarDays, MapPin, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PageStatus = 'loading' | 'success' | 'already_registered' | 'event_full' | 'error';

function InscriptionContent() {
  const params = useParams();
  const jeton = params?.jeton as string;
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventLocation, setEventLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!jeton) return;

    const processInscription = async () => {
      try {
        const { firestore: db } = initializeFirebase();

        // 1. Récupérer l'invitation
        const invitationRef = doc(db, 'invitations_evenement', jeton);
        const invitationSnap = await getDoc(invitationRef);

        if (!invitationSnap.exists()) {
          setStatus('error');
          setErrorDetails('NOT_FOUND');
          return;
        }

        const invitation = invitationSnap.data();

        // 2. Déjà inscrit via ce lien
        if (invitation.statut === 'inscrit') {
          setStatus('already_registered');
          return;
        }

        const { evenementId, adherentId } = invitation;

        // 3. Récupérer l'événement
        const eventSnap = await getDoc(doc(db, 'evenements', evenementId));
        if (!eventSnap.exists()) {
          setStatus('error');
          setErrorDetails('EVENT_NOT_FOUND');
          return;
        }

        const event = eventSnap.data();
        const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        setEventTitle(event.titre);
        setEventDate(formattedDate);
        setEventLocation(event.lieu);

        // 4. Vérifier si l'adhérent est déjà inscrit via une autre voie
        const existingQuery = query(
          collection(db, 'inscriptions'),
          where('id_evenement', '==', evenementId),
          where('id_adherent', '==', adherentId)
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
          await updateDoc(invitationRef, { statut: 'inscrit', dateInscription: new Date().toISOString() });
          setStatus('already_registered');
          return;
        }

        // 5. Vérifier la capacité
        if (event.nombrePlacesMax && event.nombrePlacesMax > 0) {
          const allInscriptionsSnap = await getDocs(
            query(collection(db, 'inscriptions'), where('id_evenement', '==', evenementId))
          );
          if (allInscriptionsSnap.size >= event.nombrePlacesMax) {
            setStatus('event_full');
            return;
          }
        }

        // 6. Créer l'inscription
        await addInscription(db, {
          id_evenement: evenementId,
          id_adherent: adherentId,
          a_paye: false,
          date_inscription: new Date().toISOString(),
        });

        // 7. Marquer l'invitation comme utilisée
        await updateDoc(invitationRef, {
          statut: 'inscrit',
          dateInscription: new Date().toISOString(),
        });

        setStatus('success');
      } catch (err: any) {
        console.error('Inscription error:', err);
        setStatus('error');
        setErrorDetails(err.message);
      }
    };

    processInscription();
  }, [jeton]);

  const statusLabel: Record<PageStatus, string> = {
    loading: 'Traitement en cours…',
    success: 'Inscription confirmée !',
    already_registered: 'Déjà inscrit(e)',
    event_full: 'Événement complet',
    error: 'Lien invalide',
  };

  const statusDescription: Record<PageStatus, string> = {
    loading: 'Nous enregistrons votre inscription, merci de patienter.',
    success: 'Votre participation a bien été enregistrée. À bientôt chez H2VL !',
    already_registered: 'Vous êtes déjà inscrit(e) à cet événement.',
    event_full: 'Désolé, toutes les places sont prises pour cet événement.',
    error: "Ce lien n'est pas valide ou a expiré.",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-2">
          {/* Zone d'icône — purement décorative, masquée aux lecteurs d'écran */}
          <div className="flex justify-center mb-6" aria-hidden="true">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {status === 'loading' && <Loader2 className="h-8 w-8 text-primary animate-spin" />}
              {status === 'success' && <CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />}
              {status === 'already_registered' && <UserCheck className="h-10 w-10 text-blue-500" />}
              {status === 'event_full' && <AlertCircle className="h-10 w-10 text-orange-500" />}
              {status === 'error' && <AlertCircle className="h-10 w-10 text-destructive" />}
            </div>
          </div>

          {/* Titre — annoncé comme un live region pour les changements d'état */}
          <CardTitle
            className="text-2xl font-bold tracking-tight"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusLabel[status]}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6 pt-4">
          {/* Description d'état — synchronisée avec le titre */}
          <p
            className="text-muted-foreground text-base leading-relaxed"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusDescription[status]}
          </p>

          {status === 'success' && eventTitle && (
            <div
              className="bg-green-50 border border-green-100 rounded-xl p-4 text-left space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
              role="region"
              aria-label={`Détails de l'événement : ${eventTitle}`}
            >
              <p className="font-bold text-green-800 text-base">{eventTitle}</p>
              {eventDate && (
                <p className="flex items-center gap-2 text-sm text-green-700">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{eventDate}</span>
                </p>
              )}
              {eventLocation && (
                <p className="flex items-center gap-2 text-sm text-green-700">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{eventLocation}</span>
                </p>
              )}
            </div>
          )}

          {status === 'already_registered' && eventTitle && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 font-medium">
              {eventTitle}
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left" role="region" aria-label="Informations de diagnostic">
              <p className="font-bold text-xs mb-2 uppercase tracking-widest text-muted-foreground" aria-hidden="true">Diagnostic</p>
              <dl className="space-y-1 font-mono text-[10px] break-all">
                <div className="flex gap-1">
                  <dt className="text-primary">Jeton :</dt>
                  <dd>{jeton || 'manquant'}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-primary">Erreur :</dt>
                  <dd>{errorDetails || 'N/A'}</dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function InscriptionInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Chargement en cours">
        <Loader2 className="h-12 w-12 text-primary animate-spin" aria-hidden="true" />
      </div>
    }>
      <InscriptionContent />
    </Suspense>
  );
}
