'use client';
import { db, auth } from '@/lib/firebase';
import type { LogAdmin } from '@/lib/types';
import { collection, getDocs, addDoc, orderBy, query } from 'firebase/firestore';

const logsCollection = collection(db, 'logs_admin');

export async function getLogs(): Promise<LogAdmin[]> {
    const q = query(logsCollection, orderBy('dateAction', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogAdmin));
}

export async function addLog(actionRealisee: string): Promise<string> {
    const user = auth.currentUser;
    const logData = {
        nomAdmin: user?.email || 'Système',
        actionRealisee,
        dateAction: new Date().toISOString()
    };
    const docRef = await addDoc(logsCollection, logData);
    return docRef.id;
}
