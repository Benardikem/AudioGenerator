/**
 * DO NOT SWITCH THIS BACK TO FIRESTORE. See GEMINI.md.
 *
 * Saved commercials live in the studio's own PostgreSQL database, reached through the server's
 * /api/commercials routes (commercialsStore.ts). Firestore failed on both counts that matter:
 * the AI Studio database refuses requests from studio.legitafrica.com, and its 1 MB document
 * limit is smaller than a 30-second voiceover.
 *
 * The exported functions and CommercialRecord keep the shape the Firestore version had, so the
 * rest of the app didn't need to change.
 */

export interface CommercialRecord {
  id: string;
  title: string;
  script: string;
  voice: string;
  voiceName?: string;
  timbre?: 'standard' | 'baritone' | 'bass';
  style: string;
  /** A data URL straight after generation; /api/commercials/:id/audio once saved. */
  audioUrl?: string;
  duration?: number;
  scenes?: string; // JSON string of AdvertScene[]
  aspectRatio?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Firestore pushed changes to subscribers on its own. Without it, anything that saves or
// deletes tells the open subscriptions to reload, and a slow poll picks up other tabs.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((reload) => reload());

/** All saved commercials, most recently updated first. */
export function getSavedCommercials(): Promise<CommercialRecord[]> {
  return api<CommercialRecord[]>('/api/commercials');
}

/** Calls onUpdate now and whenever the saved list changes. Returns an unsubscribe function. */
export function subscribeToSavedCommercials(
  onUpdate: (commercials: CommercialRecord[]) => void,
  onError?: (err: Error) => void
) {
  let stopped = false;
  const reload = () => {
    getSavedCommercials()
      .then((records) => {
        if (!stopped) onUpdate(records);
      })
      .catch((err) => {
        if (!stopped && onError) onError(err);
      });
  };

  reload();
  listeners.add(reload);
  const poll = setInterval(reload, 30_000);

  return () => {
    stopped = true;
    listeners.delete(reload);
    clearInterval(poll);
  };
}

/** Save or update a commercial. Returns the stored record, with its saved audio URL. */
export async function saveCommercial(
  record: Omit<CommercialRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<CommercialRecord> {
  const id = record.id || `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const saved = await api<CommercialRecord>(`/api/commercials/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...record, id, createdAt: record.createdAt || new Date().toISOString() }),
  });
  notify();
  return saved;
}

/** Delete a commercial by its ID. */
export async function deleteCommercial(id: string): Promise<void> {
  await api<void>(`/api/commercials/${encodeURIComponent(id)}`, { method: 'DELETE' });
  notify();
}
