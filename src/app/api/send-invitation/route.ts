/**
 * Route obsolète — remplacée par /api/queue-invitations + /api/process-invitation-queue.
 * Retourne 410 Gone pour éviter toute utilisation non intentionnelle.
 */
export async function POST() {
  return new Response('Route obsolète. Utiliser /api/queue-invitations.', { status: 410 });
}
