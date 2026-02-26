'use client';
import { collection, addDoc, type Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

const logsCollectionName = 'logs_admin';

export async function addLog(db: Firestore, auth: Auth, actionRealisee: string): Promise<string> {
    const user = auth.currentUser;
    const logData = {
        nomAdmin: user?.email || 'Système',
        actionRealisee,
        dateAction: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, logsCollectionName), logData);
    return docRef.id;
}
