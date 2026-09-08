/**
 * Gazette Editorial Studio — IndexedDB Local Draft Storage Service
 * Provides asynchronous, high-capacity local draft snapshot storage
 * that survives browser crashes, power cuts, and accidental closures.
 */

export interface LocalDraftSnapshot {
  articleId: string;
  baseVersion: number;
  seq: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  categoryId: string;
  tagIds: string[];
  tags: string[];
  coverImage: string | null;
  seoTitle?: string;
  seoDescription?: string;
  status?: string;
  showAuthorName?: boolean;
  wordCount: number;
  readingTimeMinutes: number;
  savedAt: string; // ISO string
}

const DB_NAME = 'gazette_editorial_db';
const DB_VERSION = 1;
const STORE_NAME = 'draft_snapshots';

class DraftStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'articleId' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Asynchronously saves a draft snapshot to IndexedDB with localStorage fallback
   */
  async saveSnapshot(snapshot: LocalDraftSnapshot): Promise<void> {
    const key = snapshot.articleId || 'new';
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ ...snapshot, articleId: key });

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Fallback to localStorage if IndexedDB is blocked in private browsing
      try {
        localStorage.setItem(`gazette_idb_fallback_${key}`, JSON.stringify(snapshot));
      } catch (fallbackErr) {
        console.warn('Draft snapshot storage failed', fallbackErr);
      }
    }
  }

  /**
   * Retrieves a draft snapshot from IndexedDB (or fallback localStorage)
   */
  async getSnapshot(articleId: string = 'new'): Promise<LocalDraftSnapshot | null> {
    const key = articleId || 'new';
    try {
      const db = await this.getDB();
      return await new Promise<LocalDraftSnapshot | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Check fallback
      try {
        const raw = localStorage.getItem(`gazette_idb_fallback_${key}`);
        if (raw) return JSON.parse(raw);
      } catch {
        return null;
      }
      return null;
    }
  }

  /**
   * Deletes a snapshot after successful authoritative server persistence
   */
  async deleteSnapshot(articleId: string = 'new'): Promise<void> {
    const key = articleId || 'new';
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }

    try {
      localStorage.removeItem(`gazette_idb_fallback_${key}`);
    } catch {
      // ignore
    }
  }
}

export const draftStorageService = new DraftStorageService();
