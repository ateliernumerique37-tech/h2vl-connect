/**
 * Route obsolète. La validation est désormais gérée directement côté client
 * dans /public/confirmation/[jeton]/page.tsx pour éviter les conflits d'initialisation Firebase.
 */
export async function POST() {
  return new Response("Route moved to client-side", { status: 410 });
}
