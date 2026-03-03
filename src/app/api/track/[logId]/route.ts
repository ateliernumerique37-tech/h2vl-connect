
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(
  request: Request,
  { params }: { params: { logId: string } }
) {
  const logId = params.logId;

  try {
    // Initialisation Firebase côté serveur
    const { firestore } = initializeFirebase();
    
    // Mise à jour du log pour marquer l'ouverture
    const logRef = doc(firestore, 'email_logs', logId);
    await updateDoc(logRef, {
      ouvert: true,
      dateOuverture: new Date().toISOString()
    });
  } catch (error) {
    console.error("Tracking Error:", error);
  }

  // Retourne une image 1x1 GIF transparente
  const buffer = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
