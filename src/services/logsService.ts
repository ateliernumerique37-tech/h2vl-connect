'use client';
import { collection, getDocs, addDoc, orderBy, query, Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import type { LogAdmin } from '@/lib/types';

const logsCollectionName = 'logs_admin';

export async function getLogs(db: Firestore): Promise<LogAdmin[]> {
    const logsCollection = collection(db, logsCollectionName);
    const q = query(logsCollection, orderBy('dateAction', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogAdmin));
}

export async function addLog(db: Firestore, auth: Auth, actionRealisee: string): Promise<string> {
    const logsCollection = collection(db, logsCollectionName);
    const user = auth.currentUser;
    const logData = {
        nomAdmin: user?.email || 'Système',
        actionRealisee,
        dateAction: new Date().toISOString()
    };
    const docRef = await addDoc(logsCollection, logData);
    return docRef.id;
}
