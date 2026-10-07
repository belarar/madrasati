/**
 * Client-Side IndexedDB Storage for School Files
 * تخزين محلي دائم عالي السعة (مئات الميغابايت) لملفات PDF و Word والصور
 * يمنع فقدان الملفات المرفوعة حتى عند إعادة تحميل الصفحة أو تبديل الحسابات
 */

const DB_NAME = 'school_files_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredFile {
  id: string; // doc or announcement id
  fileName: string;
  fileFormat: string;
  fileSize: string;
  dataUrl: string;
  updatedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB غير مدعوم في هذه البيئة'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = event => {
      console.warn('[IndexedDB] خطأ في فتح قاعدة البيانات:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function saveFileToIndexedDb(
  id: string,
  dataUrl: string,
  fileName: string,
  fileFormat: string,
  fileSize: string
): Promise<boolean> {
  if (!id || !dataUrl) return false;
  try {
    const db = await getDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredFile = {
        id,
        fileName,
        fileFormat,
        fileSize,
        dataUrl,
        updatedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.debug('[IndexedDB] خطأ حفظ الملف:', err);
    return false;
  }
}

export async function getFileFromIndexedDb(id: string): Promise<StoredFile | null> {
  if (!id) return null;
  try {
    const db = await getDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteFileFromIndexedDb(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const db = await getDb();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
