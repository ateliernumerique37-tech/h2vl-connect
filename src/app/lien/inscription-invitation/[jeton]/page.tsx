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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { Inscription, Evenement } from '@/lib/types';

type PageStatus = 'loading' | 'pending_choices' | 'submitting' | 'success' | 'already_registered' | 'event_full' | 'error';

const MENU_ORDER = [
  { key: 'aperitifChoisi',  label: 'Apéritif',       field: 'aperitifs'  },
  { key: 'entreeChoisie',   label: 'Entrée',          field: 'entrees'    },
  { key: 'platChoisi',      label: 'Plat principal',  field: 'plats'      },
  { key: 'fromageChoisi',   label: 'Fromage',         field: 'fromages'   },
  { key: 'dessertChoisi',   label: 'Dessert',         field: 'desserts'   },
] as const;

function InscriptionContent() {
  const params = useParams();
  const jeton = params?.jeton as string;

  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Données de l'événement affichées dans la page
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventLocation, setEventLocation] = useState<string | null>(null);

  // Données complètes de l'événement (pour afficher les choix)
  const [eventData, setEventData] = useState<Partial<Evenement> | null>(null);

  // IDs nécessaires pour créer l'inscription différée
  const [pendingIds, setPendingIds] = useState<{ evenementId: string; adherentId: string } | null>(null);

  // Choix de l'utilisateur
  const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
  const [bowlingChoices, setBowlingChoices] = useState<Inscription['choixBowling']>({});

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

        const event = eventSnap.data() as Evenement;
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
        setEventData(event);

        // 4. Vérifier si déjà inscrit via une autre voie
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

        // 6. Si l'événement nécessite des choix (menu ou bowling), on affiche le formulaire
        if (event.necessiteMenu || event.estSortieBowling) {
          setPendingIds({ evenementId, adherentId });
          setStatus('pending_choices');
          return;
        }

        // 7. Sinon, inscription directe (comportement original)
        await addInscription(db, {
          id_evenement: evenementId,
          id_adherent: adherentId,
          a_paye: false,
          date_inscription: new Date().toISOString(),
        });

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

  // Soumission différée avec les choix
  const handleConfirmWithChoices = async () => {
    if (!pendingIds) return;
    setStatus('submitting');

    try {
      const { firestore: db } = initializeFirebase();

      const inscriptionData: Omit<Inscription, 'id'> = {
        id_evenement: pendingIds.evenementId,
        id_adherent: pendingIds.adherentId,
        a_paye: false,
        date_inscription: new Date().toISOString(),
        ...(eventData?.necessiteMenu && { choixMenu: menuChoices }),
        ...(eventData?.estSortieBowling && { choixBowling: bowlingChoices }),
      };

      await addInscription(db, inscriptionData);

      const invitationRef = doc(db, 'invitations_evenement', jeton);
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

  // ── Rendu : formulaire de choix ──────────────────────────────────────────
  if (status === 'pending_choices' || status === 'submitting') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg shadow-xl border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold tracking-tight text-center">
              Confirmer mon inscription
            </CardTitle>
            {eventTitle && (
              <div
                className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-1"
                role="region"
                aria-label={`Détails de l'événement`}
              >
                <p className="font-bold text-primary text-base">{eventTitle}</p>
                {eventDate && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{eventDate}</span>
                  </p>
                )}
                {eventLocation && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{eventLocation}</span>
                  </p>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* ── Choix de menu ────────────────────────────────────────── */}
            {eventData?.necessiteMenu && eventData.optionsMenu && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/5">
                <h2 className="font-bold text-sm uppercase tracking-wider text-primary/80 border-b pb-2">
                  Choix du menu
                </h2>
                <div className="space-y-5">
                  {MENU_ORDER.map(({ key, label, field }) => {
                    const options = eventData.optionsMenu?.[field];
                    if (!options?.length) return null;
                    return (
                      <div key={key} className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </Label>
                        <RadioGroup
                          value={menuChoices?.[key] ?? ''}
                          onValueChange={(value) =>
                            setMenuChoices((prev) => ({ ...prev, [key]: value }))
                          }
                          aria-label={`Choix pour ${label}`}
                          className="grid gap-1"
                        >
                          {options.map((option, idx) => {
                            const optionId = `menu-${key}-${idx}`;
                            return (
                              <div
                                key={optionId}
                                className="flex items-center space-x-2 rounded-md border p-2 hover:bg-muted/50 transition-colors"
                              >
                                <RadioGroupItem value={option} id={optionId} />
                                <Label htmlFor={optionId} className="flex-1 cursor-pointer text-sm font-normal">
                                  {option}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Options bowling ──────────────────────────────────────── */}
            {eventData?.estSortieBowling && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/5">
                <h2 className="font-bold text-sm uppercase tracking-wider text-primary/80 border-b pb-2">
                  🎳 Options bowling
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="bowling-barrieres"
                      checked={bowlingChoices?.avecBarrieres ?? false}
                      onCheckedChange={(checked) =>
                        setBowlingChoices((prev) => ({
                          ...prev,
                          avecBarrieres: checked === true,
                          sansBarrieres: checked === true ? false : prev?.sansBarrieres,
                        }))
                      }
                      aria-label="Je joue avec barrières"
                    />
                    <Label htmlFor="bowling-barrieres" className="flex-1 cursor-pointer text-sm font-normal">
                      Avec barrières
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="bowling-sans-barrieres"
                      checked={bowlingChoices?.sansBarrieres ?? false}
                      onCheckedChange={(checked) =>
                        setBowlingChoices((prev) => ({
                          ...prev,
                          sansBarrieres: checked === true,
                          avecBarrieres: checked === true ? false : prev?.avecBarrieres,
                        }))
                      }
                      aria-label="Je joue sans barrières"
                    />
                    <Label htmlFor="bowling-sans-barrieres" className="flex-1 cursor-pointer text-sm font-normal">
                      Sans barrières
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="bowling-gouter"
                      checked={bowlingChoices?.prendGouter ?? false}
                      onCheckedChange={(checked) =>
                        setBowlingChoices((prev) => ({ ...prev, prendGouter: checked === true }))
                      }
                      aria-label="Je prends le goûter de l'amitié"
                    />
                    <Label htmlFor="bowling-gouter" className="flex-1 cursor-pointer text-sm font-normal">
                      Prend le goûter de l'amitié
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              className="w-full h-12 text-base font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={handleConfirmWithChoices}
              disabled={status === 'submitting'}
              aria-label="Confirmer mon inscription"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Enregistrement…
                </>
              ) : (
                '✅ Confirmer mon inscription'
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  // ── Rendu : états finaux (loading / success / already_registered / full / error) ──
  const statusLabel: Record<Exclude<PageStatus, 'pending_choices' | 'submitting'>, string> = {
    loading: 'Traitement en cours…',
    success: 'Inscription confirmée !',
    already_registered: 'Déjà inscrit(e)',
    event_full: 'Événement complet',
    error: 'Lien invalide',
  };

  const statusDescription: Record<Exclude<PageStatus, 'pending_choices' | 'submitting'>, string> = {
    loading: 'Nous vérifions votre invitation, merci de patienter.',
    success: 'Votre participation a bien été enregistrée. À bientôt chez H2VL !',
    already_registered: 'Vous êtes déjà inscrit(e) à cet événement.',
    event_full: 'Désolé, toutes les places sont prises pour cet événement.',
    error: "Ce lien n'est pas valide ou a expiré.",
  };

  const safeStatus = status as Exclude<PageStatus, 'pending_choices' | 'submitting'>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6" aria-hidden="true">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {status === 'loading' && <Loader2 className="h-8 w-8 text-primary animate-spin" />}
              {status === 'success' && <CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />}
              {status === 'already_registered' && <UserCheck className="h-10 w-10 text-blue-500" />}
              {status === 'event_full' && <AlertCircle className="h-10 w-10 text-orange-500" />}
              {status === 'error' && <AlertCircle className="h-10 w-10 text-destructive" />}
            </div>
          </div>

          <CardTitle
            className="text-2xl font-bold tracking-tight"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusLabel[safeStatus]}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6 pt-4">
          <p
            className="text-muted-foreground text-base leading-relaxed"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusDescription[safeStatus]}
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
