// Opslag op de tablet zelf (IndexedDB). Niets gaat naar het internet.
// Vertrokken van de opslag in SingApp (gekopieerd, niet gedeeld).
// Tabellen: `kv` (kleine waarden zoals instellingen, blok 2), `profiles` (blok 5), `songs` (eigen MIDI-liedjes, blok 10),
// `studio` (naspeelstudio: mp3 + nagespeelde melodie, blok 11).
// Latere blokken voegen tabellen toe (opnames) door DB_VERSION te verhogen. Nooit een tabel wissen.

const DB_NAME = 'debut-loading';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('studio')) db.createObjectStore('studio', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function kvGet(key: string): Promise<unknown> {
  const db = await openDb();
  return result(db.transaction('kv').objectStore('kv').get(key) as IDBRequest<unknown>);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put(value, key);
  await done(tx);
}

export async function profilesAll(): Promise<unknown[]> {
  const db = await openDb();
  return result(db.transaction('profiles').objectStore('profiles').getAll() as IDBRequest<unknown[]>);
}

export async function profilePut(profile: { id: string }): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('profiles', 'readwrite');
  tx.objectStore('profiles').put(profile);
  await done(tx);
}

export async function profileDelete(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('profiles', 'readwrite');
  tx.objectStore('profiles').delete(id);
  await done(tx);
}

export async function songsAll(): Promise<unknown[]> {
  const db = await openDb();
  return result(db.transaction('songs').objectStore('songs').getAll() as IDBRequest<unknown[]>);
}

export async function songPut(song: { id: string }): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('songs', 'readwrite');
  tx.objectStore('songs').put(song);
  await done(tx);
}

export async function songDelete(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('songs', 'readwrite');
  tx.objectStore('songs').delete(id);
  await done(tx);
}

export async function studioAll(): Promise<unknown[]> {
  const db = await openDb();
  return result(db.transaction('studio').objectStore('studio').getAll() as IDBRequest<unknown[]>);
}

export async function studioPut(rec: { id: string }): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('studio', 'readwrite');
  tx.objectStore('studio').put(rec);
  await done(tx);
}

export async function studioDelete(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('studio', 'readwrite');
  tx.objectStore('studio').delete(id);
  await done(tx);
}

export type Persistence = 'blijvend' | 'tijdelijk' | 'onbekend';

/**
 * Vraagt Android/Chrome om de gegevens van de app niet zomaar op te ruimen als de opslag vol raakt.
 * Chrome geeft dit meestal pas als de app op het startscherm staat of vaak gebruikt wordt.
 */
export async function requestPersistence(): Promise<Persistence> {
  try {
    const storage = navigator.storage;
    if (!storage?.persist) return 'onbekend';
    if (await storage.persisted()) return 'blijvend';
    return (await storage.persist()) ? 'blijvend' : 'tijdelijk';
  } catch {
    return 'onbekend';
  }
}
