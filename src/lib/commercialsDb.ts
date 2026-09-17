import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { AdvertScene } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CommercialRecord {
  id: string;
  title: string;
  script: string;
  voice: string;
  voiceName?: string;
  timbre?: 'standard' | 'baritone' | 'bass';
  style: string;
  audioUrl?: string;
  duration?: number;
  scenes?: string; // JSON string of AdvertScene[]
  aspectRatio?: string;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION_NAME = 'commercials';

/**
 * Fetch all saved commercials from Firestore, ordered by most recently updated
 */
export async function getSavedCommercials(): Promise<CommercialRecord[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);
    const records: CommercialRecord[] = [];
    snapshot.forEach((d) => {
      records.push({ id: d.id, ...d.data() } as CommercialRecord);
    });
    // Sort descending by updatedAt or createdAt
    return records.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

/**
 * Subscribe to real-time changes of saved commercials
 */
export function subscribeToSavedCommercials(
  onUpdate: (commercials: CommercialRecord[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(
      q,
      (snapshot) => {
        const records: CommercialRecord[] = [];
        snapshot.forEach((d) => {
          records.push({ id: d.id, ...d.data() } as CommercialRecord);
        });
        records.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        onUpdate(records);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

/**
 * Save or update a commercial campaign in the database
 */
export async function saveCommercial(
  record: Omit<CommercialRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<CommercialRecord> {
  const docId = record.id || `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const payload: CommercialRecord = {
    ...record,
    id: docId,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, docId), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${docId}`);
  }
}

/**
 * Delete a commercial campaign by its ID
 */
export async function deleteCommercial(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
