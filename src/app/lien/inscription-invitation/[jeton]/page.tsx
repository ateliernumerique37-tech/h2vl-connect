'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Loader2, CalendarDays, MapPin, UserCheck } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { Inscription, Evenement } from '@/lib/types';

type PageStatus = 'loading' | 'pending_choices' | 'submitting' | 'success' | 'already_registered' | 'event_full' | 'registration_closed' | 'error';

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

  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventDateFin, setEventDateFin] = useState<string | null>(null);
  const [eventLocation, setEventLocation] = useState<string | null>(null);
  const [eventData, setEventData] = useState<Partial<Evenement> | null>(null);

  const [menuChoices, setMenuChoices] = useState<Inscription['choixMenu']>({});
  const [bowlingChoices, setBowlingChoices] = useState<Inscription['choixBowling']>({});

  // Appelle l'API Admin SDK et gère la réponse
  const callConfirmApi = async (extraChoices?: { menuChoices?: Inscription['choixMenu']; bowlingChoices?: Inscription['choixBowling'] }) => {
    const res = await fetch('/api/confirm-inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jeton, ...extraChoices }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      const err = data.error as string;
      if (err === 'ALREADY_REGISTERED') { setStatus('already_registered'); return; }
      if (err === 'EVENT_FULL')         { setStatus('event_full'); return; }
      if (err === 'REGISTRATION_CLOSED') { setStatus('registration_closed'); return; }
      setStatus('error');
      setErrorDetails(err);
      return;
    }

    // Envoi de l'e-mail de confirmation (best-effort)
    if (data.adherentEmail) {
      try {
        const annulationUrl = `${window.location.origin}/lien/annulation/${data.jetonAnnulation}`;
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.adherentEmail,
            firstName: data.adherentFirstName || '',
            eventTitle: data.eventTitle,
            eventDate: data.eventDate,
            eventDateFin: data.eventDateFin,
            eventLocation: data.eventLocation,
            menuChoices: extraChoices?.menuChoices ?? null,
            bowlingChoices: extraChoices?.bowlingChoices ?? null,
            annulationUrl,
          }),
        });
      } catch (e) {
        console.error('Email confirmation failed:', e);
      }
    }

    setStatus('success');
  };

  useEffect(() => {
    if (!jeton) return;

    const init = async () => {
      try {
        const { firestore: db } = initializeFirebase();

        // Lire l'invitation (collection publique)
        const invitationSnap = await getDoc(doc(db, 'invitations_evenement', jeton));
        if (!invitationSnap.exists()) {
          setStatus('error');
          setErrorDetails('NOT_FOUND');
          return;
        }

        const invitation = invitationSnap.data();

        if (invitation.statut === 'inscrit') {
          setStatus('already_registered');
          return;
        }

        // Lire l'événement (collection désormais publique)
        const eventSnap = await getDoc(doc(db, 'evenements', invitation.evenementId));
        if (!eventSnap.exists()) {
          setStatus('error');
          setErrorDetails('EVENT_NOT_FOUND');
          return;
        }

        const event = eventSnap.data() as Evenement;

        const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });

        setEventTitle(event.titre);
        setEventDate(fmt(event.date));
        if (event.dateFin) setEventDateFin(fmt(event.dateFin));
        setEventLocation(event.lieu);
        setEventData(event);

        // Si l'événement nécessite des choix, afficher le formulaire
        if (event.necessiteMenu || event.estSortieBowling) {
          setStatus('pending_choices');
          return;
        }

        // Sinon, inscription directe via l'API Admin SDK
        await callConfirmApi();

      } catch (err: any) {
        console.error('Inscription error:', err);
        setStatus('error');
        setErrorDetails(err.message);
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jeton]);

  const handleConfirmWithChoices = async () => {
    setStatus('submitting');
    await callConfirmApi({
      menuChoices: eventData?.necessiteMenu ? menuChoices : undefined,
      bowlingChoices: eventData?.estSortieBowling ? bowlingChoices : undefined,
    });
  };

  // ── Formulaire de choix ──────────────────────────────────────────────────
  if (status === 'pending_choices' || status === 'submitting') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg shadow-xl border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold tracking-tight text-center">
              Confirmer mon inscription
            </CardTitle>
            {eventTitle && (
              <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-1" role="region" aria-label="Détails de l'événement">
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
            {/* Choix de menu */}
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
                          onValueChange={(value) => setMenuChoices(prev => ({ ...prev, [key]: value }))}
                          aria-label={`Choix pour ${label}`}
                          className="grid gap-1"
                        >
                          {options.map((option, idx) => {
                            const optionId = `menu-${key}-${idx}`;
                            return (
                              <div key={optionId} className="flex items-center space-x-2 rounded-md border p-2 hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option} id={optionId} />
                                <Label htmlFor={optionId} className="flex-1 cursor-pointer text-sm font-normal">{option}</Label>
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

            {/* Options bowling */}
            {eventData?.estSortieBowling && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/5">
                <h2 className="font-bold text-sm uppercase tracking-wider text-primary/80 border-b pb-2">
                  🎳 Options bowling
                </h2>
                <div className="space-y-2">
                  {[
                    {
                      id: 'bowling-barrieres',
                      label: 'Avec barrières',
                      checked: bowlingChoices?.avecBarrieres ?? false,
                      onChange: (checked: boolean) => setBowlingChoices(prev => ({
                        ...prev, avecBarrieres: checked, sansBarrieres: checked ? false : prev?.sansBarrieres,
                      })),
                    },
                    {
                      id: 'bowling-sans-barrieres',
                      label: 'Sans barrières',
                      checked: bowlingChoices?.sansBarrieres ?? false,
                      onChange: (checked: boolean) => setBowlingChoices(prev => ({
                        ...prev, sansBarrieres: checked, avecBarrieres: checked ? false : prev?.avecBarrieres,
                      })),
                    },
                    {
                      id: 'bowling-gouter',
                      label: "Prend le goûter de l'amitié",
                      checked: bowlingChoices?.prendGouter ?? false,
                      onChange: (checked: boolean) => setBowlingChoices(prev => ({ ...prev, prendGouter: checked })),
                    },
                  ].map(({ id, label, checked, onChange }) => (
                    <div key={id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={label} />
                      <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">{label}</Label>
                    </div>
                  ))}
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Enregistrement…</>
              ) : (
                '✅ Confirmer mon inscription'
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  // ── États finaux ─────────────────────────────────────────────────────────
  const statusConfig: Record<Exclude<PageStatus, 'pending_choices' | 'submitting'>, {
    icon: React.ReactNode;
    title: string;
    description: string;
  }> = {
    loading:             { icon: <Loader2 className="h-8 w-8 text-primary animate-spin" />,                          title: 'Traitement en cours…',       description: 'Nous vérifions votre invitation, merci de patienter.' },
    success:             { icon: <CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />, title: 'Inscription confirmée !',    description: 'Votre participation a bien été enregistrée. À bientôt chez H2VL !' },
    already_registered:  { icon: <UserCheck className="h-10 w-10 text-blue-500" />,                                   title: 'Déjà inscrit(e)',            description: 'Vous êtes déjà inscrit(e) à cet événement.' },
    event_full:          { icon: <AlertCircle className="h-10 w-10 text-orange-500" />,                               title: 'Événement complet',          description: 'Désolé, toutes les places sont prises pour cet événement.' },
    registration_closed: { icon: <AlertCircle className="h-10 w-10 text-orange-500" />,                               title: 'Inscriptions fermées',       description: 'Les inscriptions pour cet événement sont maintenant fermées.' },
    error:               { icon: <AlertCircle className="h-10 w-10 text-destructive" />,                              title: 'Lien invalide',              description: "Ce lien n'est pas valide ou a expiré." },
  };

  const safeStatus = status as Exclude<PageStatus, 'pending_choices' | 'submitting'>;
  const { icon, title, description } = statusConfig[safeStatus];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6" aria-hidden="true">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight" role="status" aria-live="polite" aria-atomic="true">
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6 pt-4">
          <p className="text-muted-foreground text-base leading-relaxed" aria-live="polite" aria-atomic="true">
            {description}
          </p>

          {status === 'success' && eventTitle && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-left space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500" role="region" aria-label={`Détails de l'événement : ${eventTitle}`}>
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
