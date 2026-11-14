// Opslag op de tablet zelf (IndexedDB). Niets gaat naar het internet.
// Vertrokken van de opslag in SingApp (gekopieerd, niet gedeeld).
// Blok 2: enkel de tabel `kv` (kleine waarden zoals instellingen).
// Latere blokken voegen tabellen toe (profielen, liedjes, opnames) door DB_VERSION te verhogen.

const DB_NAME = 'debut-loading';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
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
