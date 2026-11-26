import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  enableNetwork,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import {
  AppNotification,
  ParentSummon,
  PeerExchangePost,
  PrivateConversation,
  PrivateMessage,
  SchoolAnnouncement,
  SchoolDocument,
  UserPresenceRecord,
  UserProfile,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const QUOTA_STORAGE_KEY = 'ben_naama_firestore_quota_until';

function readPersistedQuotaUntil(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    const val = raw ? Number(raw) : 0;
    return Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

let firestoreQuotaExceededUntil = readPersistedQuotaUntil();

export function isFirestoreQuotaExceeded(): boolean {
  if (Date.now() < firestoreQuotaExceededUntil) return true;
  const persisted = readPersistedQuotaUntil();
  if (Date.now() < persisted) {
    firestoreQuotaExceededUntil = persisted;
    return true;
  }
  return false;
}

export function detectFirestoreQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  const code = typeof error === 'object' && error !== null ? (error as any).code : '';
  if (
    code === 'resource-exhausted' ||
    msg.includes('Quota exceeded') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429')
  ) {
    const already = isFirestoreQuotaExceeded();
    firestoreQuotaExceededUntil = Date.now() + 10 * 60 * 1000;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(QUOTA_STORAGE_KEY, String(firestoreQuotaExceededUntil));
      } catch {}
    }
    if (!already && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    }
    return true;
  }
  return false;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  detectFirestoreQuotaError(error);
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
}

// Validate connection to Firestore on initialization
export async function testConnection(): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) return false;
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    console.log('[Firestore] Cloud database connection verified.');
    return true;
  } catch (error) {
    detectFirestoreQuotaError(error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Please check your Firebase configuration or internet connection.');
    }
    return false;
  }
}

// Collection references
const docsCol = collection(firestore, 'documents');
const annsCol = collection(firestore, 'announcements');
const summonsCol = collection(firestore, 'summons');
const peerCol = collection(firestore, 'peerExchanges');
const notifsCol = collection(firestore, 'notifications');
const privateConvCol = collection(firestore, 'private_conversations');
const privateMsgCol = collection(firestore, 'private_messages');
const resetRequestsCol = collection(firestore, 'password_reset_requests');
const staffPinsCol = collection(firestore, 'staff_pins');
const presenceCol = collection(firestore, 'user_presence');
const customStudentsCol = collection(firestore, 'custom_students');

export function resolveFirestoreTimestampIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toISOString();
  if (val instanceof Timestamp || typeof (val as any).toDate === 'function') {
    try {
      return (val as Timestamp).toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (typeof (val as any).seconds === 'number') {
    return new Date((val as any).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

export function getAnnouncementTimestampMs(val: unknown): number {
  const iso = resolveFirestoreTimestampIso(val);
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function mapFirestoreAnnouncementDoc(
  id: string,
  raw: Record<string, any>
): SchoolAnnouncement {
  const createdAt = resolveFirestoreTimestampIso(raw.createdAt ?? raw.createdAtIso);
  return {
    ...(raw as SchoolAnnouncement),
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    content: typeof raw.content === 'string' ? raw.content : '',
    target: raw.target || 'all',
    targetClass: raw.targetClass || (raw.target === 'students' ? 'ALL' : raw.target || 'all'),
    priority: raw.priority || 'normal',
    authorName: raw.authorName || 'إدارة المؤسسة',
    authorRole: raw.authorRole || 'director',
    createdAt,
  };
}

export function subscribeToAnnouncementsFromFirestore(
  onUpdate: (anns: SchoolAnnouncement[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(annsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snapshot => {
      const anns: SchoolAnnouncement[] = [];
      snapshot.forEach(d => {
        const raw = d.data({ serverTimestamps: 'estimate' }) as Record<string, any>;
        anns.push(mapFirestoreAnnouncementDoc(d.id, raw));
      });
      anns.sort(
        (a, b) => getAnnouncementTimestampMs(b.createdAt) - getAnnouncementTimestampMs(a.createdAt)
      );
      onUpdate(anns);
    },
    err => {
      detectFirestoreQuotaError(err);
      console.warn('[Firestore] Announcements onSnapshot error:', err);
      onError?.(err);
    }
  );
}

export async function refreshAnnouncementsFromFirestoreServer(): Promise<SchoolAnnouncement[]> {
  if (isFirestoreQuotaExceeded()) return [];
  if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
  try {
    await enableNetwork(firestore).catch(() => {});
    const q = query(annsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocsFromServer(q);
    const anns: SchoolAnnouncement[] = [];
    snapshot.forEach(d => {
      const raw = d.data({ serverTimestamps: 'estimate' }) as Record<string, any>;
      anns.push(mapFirestoreAnnouncementDoc(d.id, raw));
    });
    anns.sort(
      (a, b) => getAnnouncementTimestampMs(b.createdAt) - getAnnouncementTimestampMs(a.createdAt)
    );
    return anns;
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn('[Firestore] Server refresh announcements warning:', err);
    return [];
  }
}

export interface FirestorePasswordResetRequest {
  id: string;
  identifier: string;
  staffName: string;
  staffRank: string;
  requestedPin: string;
  requestDate: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: string;
}

export interface FirestoreStaffPinRecord {
  pin: string;
  updatedAt: string;
}

let isInitialized = false;

// Real-time synchronization listeners
export function initFirestoreRealtimeSync(callbacks: {
  onDocuments: (docs: SchoolDocument[]) => void;
  onAnnouncements: (anns: SchoolAnnouncement[]) => void;
  onSummons: (summons: ParentSummon[]) => void;
  onPeerExchanges: (posts: PeerExchangePost[]) => void;
  onNotifications: (notifs: AppNotification[]) => void;
  onPasswordResetRequests?: (requests: FirestorePasswordResetRequest[]) => void;
  onStaffPins?: (pins: Record<string, FirestoreStaffPinRecord>) => void;
  onCustomStudents?: (students: UserProfile[]) => void;
  onCloudConnected?: () => void;
}) {
  if (isInitialized || isFirestoreQuotaExceeded()) return;
  isInitialized = true;

  testConnection()
    .then(ok => {
      if (ok) callbacks.onCloudConnected?.();
    })
    .catch(() => {});
  console.log('[Firestore] Initializing real-time cloud database sync...');

  // 1. Documents real-time listener
  onSnapshot(
    docsCol,
    snapshot => {
      const docs: SchoolDocument[] = [];
      snapshot.forEach(d => {
        const data = d.data() as SchoolDocument;
        docs.push({
          ...data,
          id: d.id,
          targetClasses: Array.isArray(data.targetClasses) && data.targetClasses.length > 0 ? data.targetClasses : ['ALL'],
          targetAudience: data.targetAudience || (Array.isArray(data.targetClasses) && data.targetClasses.includes('ALL') ? 'all_students' : 'specific_class'),
          downloadCount: data.downloadCount || 0,
        });
      });

      // Sort newest first
      docs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      console.log(`[Firestore] Live documents synced: ${docs.length}`);
      callbacks.onCloudConnected?.();
      callbacks.onDocuments(docs);
    },
    err => {
      detectFirestoreQuotaError(err);
      console.warn('[Firestore] Documents subscription error:', err);
    }
  );

  // 2. Announcements real-time listener (ordered newest first with persistentLocalCache)
  subscribeToAnnouncementsFromFirestore(anns => {
    callbacks.onCloudConnected?.();
    callbacks.onAnnouncements(anns);
  });

  // 3. Summons real-time listener
  onSnapshot(
    summonsCol,
    snapshot => {
      const summons: ParentSummon[] = [];
      snapshot.forEach(d => {
        summons.push({ ...(d.data() as ParentSummon), id: d.id });
      });
      summons.sort((a, b) => new Date(b.issuedAt || (b as any).createdAt).getTime() - new Date(a.issuedAt || (a as any).createdAt).getTime());
      callbacks.onSummons(summons);
    },
    err => {
      detectFirestoreQuotaError(err);
      console.warn('[Firestore] Summons subscription error:', err);
    }
  );

  // 4. Peer Exchanges real-time listener
  onSnapshot(
    peerCol,
    snapshot => {
      const posts: PeerExchangePost[] = [];
      snapshot.forEach(d => {
        posts.push({ ...(d.data() as PeerExchangePost), id: d.id });
      });
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onPeerExchanges(posts);
    },
    err => {
      detectFirestoreQuotaError(err);
      console.warn('[Firestore] Peer exchanges subscription error:', err);
    }
  );

  // 5. Notifications real-time listener
  onSnapshot(
    notifsCol,
    snapshot => {
      const notifs: AppNotification[] = [];
      snapshot.forEach(d => {
        notifs.push({ ...(d.data() as AppNotification), id: d.id });
      });
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onNotifications(notifs);
    },
    err => {
      detectFirestoreQuotaError(err);
      console.warn('[Firestore] Notifications subscription error:', err);
    }
  );

  // 6. Password Reset Requests real-time listener (Ensures Director sees requests instantly)
  if (callbacks.onPasswordResetRequests) {
    onSnapshot(
      resetRequestsCol,
      snapshot => {
        const requests: FirestorePasswordResetRequest[] = [];
        snapshot.forEach(d => {
          requests.push({ ...(d.data() as FirestorePasswordResetRequest), id: d.id });
        });
        requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        callbacks.onPasswordResetRequests?.(requests);
      },
      err => {
        detectFirestoreQuotaError(err);
        console.warn('[Firestore] Reset requests subscription warning:', err);
      }
    );
  }

  // 7. Staff Pins real-time listener (Ensures employee activation is synchronized everywhere)
  if (callbacks.onStaffPins) {
    onSnapshot(
      staffPinsCol,
      snapshot => {
        const pins: Record<string, FirestoreStaffPinRecord> = {};
        snapshot.forEach(d => {
          const data = d.data();
          if (data && typeof data.pin === 'string' && data.pin.trim().length >= 4) {
            pins[d.id.toLowerCase()] = {
              pin: data.pin.trim(),
              updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
            };
          }
        });
        callbacks.onStaffPins?.(pins);
      },
      err => {
        detectFirestoreQuotaError(err);
        console.warn('[Firestore] Staff pins subscription warning:', err);
      }
    );
  }

  // 8. Custom Students real-time listener (Ensures newly added students can log in from any device)
  if (callbacks.onCustomStudents) {
    onSnapshot(
      customStudentsCol,
      snapshot => {
        const list: UserProfile[] = [];
        snapshot.forEach(d => {
          const data = d.data() as Partial<UserProfile>;
          if (data && data.identifier && data.name && data.activationCode) {
            list.push({
              id: data.id || `student-${data.identifier}`,
              identifier: data.identifier,
              name: data.name,
              role: 'student',
              classId: data.classId || '4AM-1',
              className: data.className || 'رابعة متوسط 01',
              activationCode: data.activationCode,
              title: data.title || `تلميذ(ة) بقسم ${data.className || 'رابعة متوسط 01'}`,
            });
          }
        });
        callbacks.onCustomStudents?.(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'custom_students')
    );
  }
}

// Cloud File Chunking (Support large PDF, Word, and Image files in Cloud Firestore)
const CHUNK_SIZE = 650000; // ~480KB binary per chunk, comfortably within 1MB Firestore limit

export async function saveFilePayloadToFirestore(parentId: string, dataUrl: string): Promise<number> {
  if (!parentId || !dataUrl) return 0;
  try {
    const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(firestore, 'file_chunks', `${parentId}_chunk_${i}`);
      await setDoc(chunkRef, {
        parentId,
        chunkIndex: i,
        totalChunks,
        data: chunkData,
        createdAt: new Date().toISOString(),
      });
    }
    return totalChunks;
  } catch (err) {
    console.debug('[Firestore] Error saving file payload chunks:', err);
    return 0;
  }
}

export async function fetchFilePayloadFromFirestore(parentId: string, expectedChunks = 1): Promise<string | null> {
  if (!parentId) return null;
  try {
    // If we only expect 1 chunk or unknown
    const firstChunkRef = doc(firestore, 'file_chunks', `${parentId}_chunk_0`);
    const firstSnap = await getDoc(firstChunkRef);
    if (!firstSnap.exists()) return null;

    const firstData = firstSnap.data();
    const total = firstData.totalChunks || expectedChunks || 1;
    let fullDataUrl = firstData.data || '';

    for (let i = 1; i < total; i++) {
      const chunkRef = doc(firestore, 'file_chunks', `${parentId}_chunk_${i}`);
      const chunkSnap = await getDoc(chunkRef);
      if (chunkSnap.exists()) {
        fullDataUrl += chunkSnap.data().data || '';
      }
    }

    return fullDataUrl;
  } catch (err) {
    console.debug('[Firestore] Error fetching file payload chunks:', err);
    return null;
  }
}

// Helper to sanitize payload for Cloud Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T, fallbackDownloadUrl?: string): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;

    // Hard limit protection: Firestore documents cannot exceed 1,048,576 bytes.
    // Base64 strings up to 800,000 chars safely fit in document directly.
    // If larger, chunks are stored in file_chunks collection.
    if (key === 'fileDataUrl') {
      if (typeof val === 'string' && val.length > 800000) {
        if (fallbackDownloadUrl && !clean.fileUrl) {
          clean.fileUrl = fallbackDownloadUrl;
        }
        clean.hasFileChunks = true;
        clean.fileChunksCount = Math.ceil(val.length / CHUNK_SIZE);
        continue;
      }
    }
    clean[key] = val;
  }

  if (fallbackDownloadUrl && !clean.fileUrl) {
    clean.fileUrl = fallbackDownloadUrl;
  }

  return clean;
}

// Cloud Database Write Operations
export async function saveDocumentToFirestore(docData: SchoolDocument): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(firestore, 'documents', docData.id);
    const downloadUrl = `/api/documents/${encodeURIComponent(docData.id)}/download`;
    const payload = sanitizeForFirestore(docData, downloadUrl);

    await setDoc(docRef, payload, { merge: true });
    console.log(`[Firestore] Document ${docData.id} saved to cloud database.`);

    // Only split into file_chunks when payload exceeds direct Firestore doc size threshold
    if (docData.fileDataUrl && typeof docData.fileDataUrl === 'string' && docData.fileDataUrl.length > 800000) {
      saveFilePayloadToFirestore(docData.id, docData.fileDataUrl).catch(() => {});
    }

    // Auto-create deterministic cloud notification
    const notifId = `notif-doc-${docData.id}`;
    const notifRef = doc(firestore, 'notifications', notifId);
    const targetClassesStr = (docData.targetClasses || []).join('، ');
    await setDoc(
      notifRef,
      {
        id: notifId,
        type: 'document',
        title: `وثيقة جديدة: ${docData.title}`,
        message: `قام ${docData.authorName || 'الأستاذ'} بنشر وثيقة جديدة (${docData.subject}) موجهة إلى: ${targetClassesStr || 'الجميع'}.`,
        targetRole: docData.targetAudience === 'teachers' ? 'teachers' : 'students',
        targetClassId: docData.targetClasses && docData.targetClasses[0] !== 'ALL' ? docData.targetClasses[0] : null,
        sourceAuthorName: docData.authorName,
        sourceId: docData.id,
        createdAt: docData.uploadDate || new Date().toISOString(),
        readBy: [],
      },
      { merge: true }
    );
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn(`[Firestore] Error saving document ${docData.id}:`, err);
  }
}

export async function deleteDocumentFromFirestore(docId: string): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await deleteDoc(doc(firestore, 'documents', docId));
    console.log(`[Firestore] Document ${docId} deleted from cloud database.`);
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn(`[Firestore] Error deleting document ${docId}:`, err);
  }
}

export async function incrementDownloadCountInFirestore(docId: string, currentCount: number): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(firestore, 'documents', docId);
    await updateDoc(docRef, { downloadCount: (currentCount || 0) + 1 });
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.debug('[Firestore] Increment dl count err:', err);
  }
}

export async function saveAnnouncementToFirestore(ann: SchoolAnnouncement): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) return false;
  try {
    const annRef = doc(firestore, 'announcements', ann.id);
    const downloadUrl = ann.fileName ? `/api/announcements/${encodeURIComponent(ann.id)}/download` : undefined;
    const payload = sanitizeForFirestore(ann, downloadUrl);
    payload.target = ann.target || 'all';
    payload.targetClass = ann.targetClass || (ann.target === 'students' ? 'ALL' : ann.target || 'all');
    payload.createdAtIso = ann.createdAt || new Date().toISOString();
    payload.createdAt = serverTimestamp();

    const writePromise = setDoc(annRef, payload, { merge: true });

    // Only split into file_chunks when payload exceeds direct Firestore doc size threshold
    if (ann.fileDataUrl && typeof ann.fileDataUrl === 'string' && ann.fileDataUrl.length > 800000) {
      saveFilePayloadToFirestore(ann.id, ann.fileDataUrl).catch(() => {});
    }

    // Auto-create deterministic cloud notification for announcement
    const notifId = `notif-ann-${ann.id}`;
    const notifRef = doc(firestore, 'notifications', notifId);
    const notifPromise = setDoc(
      notifRef,
      {
        id: notifId,
        type: 'announcement',
        title: `إعلان رسمي جديد: ${ann.title}`,
        message: (ann.content || '').slice(0, 160) + ((ann.content || '').length > 160 ? '...' : ''),
        targetRole: ann.target || 'all',
        targetClassId: ann.targetClass && ann.targetClass !== 'ALL' ? ann.targetClass : null,
        sourceAuthorName: ann.authorName || 'إدارة المؤسسة',
        sourceId: ann.id,
        createdAt: ann.createdAt || new Date().toISOString(),
        readBy: [],
      },
      { merge: true }
    );

    // Offline writes immediately persist to Firestore persistentLocalCache and trigger onSnapshot,
    // while the server acknowledgment promise resolves once online returns.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      writePromise.catch(err => detectFirestoreQuotaError(err));
      notifPromise.catch(() => {});
      return true;
    }

    await writePromise;
    notifPromise.catch(() => {});
    console.log(`[Firestore] Announcement ${ann.id} saved to cloud database.`);
    return true;
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn(`[Firestore] Error saving announcement ${ann.id}:`, err);
    return false;
  }
}

export async function deleteAnnouncementFromFirestore(annId: string): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await deleteDoc(doc(firestore, 'announcements', annId));
    await deleteDoc(doc(firestore, 'notifications', `notif-ann-${annId}`)).catch(() => {});
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn(`[Firestore] Error deleting announcement ${annId}:`, err);
  }
}

export async function saveSummonToFirestore(summon: ParentSummon): Promise<void> {
  const summonRef = doc(firestore, 'summons', summon.id);
  await setDoc(summonRef, summon, { merge: true });
}

export async function deleteSummonFromFirestore(summonId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'summons', summonId));
}

export async function savePeerPostToFirestore(post: PeerExchangePost): Promise<void> {
  const postRef = doc(firestore, 'peerExchanges', post.id);
  await setDoc(postRef, post, { merge: true });
}

export async function deletePeerPostFromFirestore(postId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'peerExchanges', postId));
}

// ================= Password Reset Requests & Staff Security =================
export async function resolvePendingResetRequestsForIdentifierInFirestore(
  identifier: string,
  status: 'approved' | 'rejected' = 'approved',
  excludeRequestId?: string
): Promise<void> {
  if (!identifier) return;
  const cleanId = identifier.trim().toLowerCase();
  try {
    const snapshot = await getDocs(resetRequestsCol);
    const nowIso = new Date().toISOString();
    const ops: Promise<void>[] = [];
    snapshot.forEach(d => {
      const data = d.data() as FirestorePasswordResetRequest;
      if (
        d.id !== excludeRequestId &&
        data?.identifier?.toLowerCase() === cleanId &&
        data.status === 'pending'
      ) {
        ops.push(
          setDoc(
            doc(firestore, 'password_reset_requests', d.id),
            { status, resolvedAt: nowIso },
            { merge: true }
          )
        );
      }
    });
    if (ops.length > 0) {
      await Promise.all(ops);
    }
  } catch (err) {
    console.warn('[Firestore] Error resolving pending reset requests:', err);
  }
}

export async function savePasswordResetRequestToFirestore(req: FirestorePasswordResetRequest): Promise<void> {
  try {
    // Supersede any stale pending requests for the same identifier so only the latest request remains pending
    const snapshot = await getDocs(resetRequestsCol);
    const cleanId = req.identifier.trim().toLowerCase();
    const cleanOps: Promise<void>[] = [];
    snapshot.forEach(d => {
      const data = d.data() as FirestorePasswordResetRequest;
      if (d.id !== req.id && data?.identifier?.toLowerCase() === cleanId && data.status === 'pending') {
        cleanOps.push(deleteDoc(doc(firestore, 'password_reset_requests', d.id)));
      }
    });
    if (cleanOps.length > 0) {
      await Promise.all(cleanOps);
    }

    await setDoc(doc(firestore, 'password_reset_requests', req.id), req);
    // Send high-priority notification to the Director
    const notifId = `notif-reset-${req.id}`;
    await setDoc(doc(firestore, 'notifications', notifId), {
      id: notifId,
      type: 'announcement',
      title: 'طلب تفعيل كلمة سر جديدة 🔑',
      message: `قام الموظف ${req.staffName} (${req.staffRank}) بطلب تعيين كلمة سر جديدة. يرجى الدخول لحسابك لتفعيلها.`,
      targetRole: 'director',
      sourceAuthorName: req.staffName,
      createdAt: new Date().toISOString(),
      readBy: [],
    });
  } catch (err) {
    console.warn('[Firestore] Error saving reset request:', err);
  }
}

export async function approvePasswordResetRequestInFirestore(req: FirestorePasswordResetRequest): Promise<void> {
  const nowIso = req.resolvedAt || new Date().toISOString();
  try {
    await setDoc(
      doc(firestore, 'password_reset_requests', req.id),
      {
        ...req,
        status: 'approved',
        resolvedAt: nowIso,
      },
      { merge: true }
    );
    await resolvePendingResetRequestsForIdentifierInFirestore(req.identifier, 'approved', req.id);
    await setDoc(doc(firestore, 'staff_pins', req.identifier.trim().toLowerCase()), {
      identifier: req.identifier.trim(),
      pin: req.requestedPin.trim(),
      updatedAt: nowIso,
    });
  } catch (err) {
    console.warn('[Firestore] Error approving reset request:', err);
  }
}

export async function rejectPasswordResetRequestInFirestore(requestId: string): Promise<void> {
  try {
    await setDoc(
      doc(firestore, 'password_reset_requests', requestId),
      {
        status: 'rejected',
        resolvedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Error rejecting reset request:', err);
  }
}

export async function deletePasswordResetRequestFromFirestore(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'password_reset_requests', requestId));
  } catch (err) {
    console.warn('[Firestore] Error deleting reset request:', err);
  }
}

export async function fetchPasswordResetRequestsFromFirestore(): Promise<FirestorePasswordResetRequest[]> {
  if (isFirestoreQuotaExceeded()) return [];
  try {
    const snapshot = await getDocs(resetRequestsCol);
    const requests: FirestorePasswordResetRequest[] = [];
    snapshot.forEach(d => {
      requests.push({ ...(d.data() as FirestorePasswordResetRequest), id: d.id });
    });
    requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    return requests;
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn('[Firestore] Error fetching reset requests:', err);
    return [];
  }
}

export async function saveStaffPinToFirestore(identifier: string, pin: string, updatedAt?: string): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  const cleanId = identifier.trim().toLowerCase();
  const cleanPin = pin.trim();
  const nowIso = updatedAt || new Date().toISOString();
  try {
    await setDoc(doc(firestore, 'staff_pins', cleanId), {
      identifier: identifier.trim(),
      pin: cleanPin,
      updatedAt: nowIso,
    });
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn('[Firestore] Error saving staff pin:', err);
  }
}

export async function fetchStaffPinFromFirestore(identifier: string): Promise<FirestoreStaffPinRecord | null> {
  if (isFirestoreQuotaExceeded()) return null;
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) return null;
  const ref = doc(firestore, 'staff_pins', cleanId);
  try {
    const snap = await getDocFromServer(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.pin === 'string' && data.pin.trim().length >= 4) {
        return {
          pin: data.pin.trim(),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
        };
      }
    }
    return null;
  } catch (err) {
    detectFirestoreQuotaError(err);
    if (isFirestoreQuotaExceeded()) return null;
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data.pin === 'string' && data.pin.trim().length >= 4) {
          return {
            pin: data.pin.trim(),
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
          };
        }
      }
    } catch {}
    return null;
  }
}

export async function fetchAllStaffPinsFromFirestore(): Promise<Record<string, FirestoreStaffPinRecord>> {
  const pins: Record<string, FirestoreStaffPinRecord> = {};
  if (isFirestoreQuotaExceeded()) return pins;
  try {
    const snapshot = await getDocs(staffPinsCol);
    snapshot.forEach(d => {
      const data = d.data();
      if (data && typeof data.pin === 'string' && data.pin.trim().length >= 4) {
        pins[d.id.toLowerCase()] = {
          pin: data.pin.trim(),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
        };
      }
    });
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn('[Firestore] Error fetching all staff pins:', err);
  }
  return pins;
}

// ================= Private Student Conversations =================
export async function savePrivateConversationToFirestore(conv: PrivateConversation): Promise<void> {
  try {
    const convRef = doc(firestore, 'private_conversations', conv.id);
    await setDoc(convRef, conv, { merge: true });
  } catch (err) {
    console.debug('[Firestore] Error saving private conversation:', err);
  }
}

export async function deletePrivateConversationFromFirestore(convId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'private_conversations', convId));
  } catch (err) {
    console.debug('[Firestore] Error deleting private conversation:', err);
  }
}

export async function savePrivateMessageToFirestore(msg: PrivateMessage): Promise<void> {
  try {
    const msgRef = doc(firestore, 'private_messages', msg.id);
    await setDoc(msgRef, msg, { merge: true });
  } catch (err) {
    console.debug('[Firestore] Error saving private message:', err);
  }
}

export function initPrivateConversationsSync(
  currentUserId: string,
  onConversations: (convs: PrivateConversation[]) => void
) {
  if (!currentUserId) return () => {};

  return onSnapshot(
    privateConvCol,
    snapshot => {
      const convs: PrivateConversation[] = [];
      snapshot.forEach(d => {
        const data = d.data() as PrivateConversation;
        // Strictly client-filter by participantIds to guarantee privacy
        if (Array.isArray(data.participantIds) && data.participantIds.includes(currentUserId)) {
          convs.push({ ...data, id: d.id });
        }
      });
      convs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      onConversations(convs);
    },
    err => console.debug('[Firestore] Private convs sync error:', err)
  );
}

export function initPrivateMessagesSync(
  conversationId: string,
  onMessages: (msgs: PrivateMessage[]) => void
) {
  if (!conversationId) return () => {};

  return onSnapshot(
    privateMsgCol,
    snapshot => {
      const msgs: PrivateMessage[] = [];
      snapshot.forEach(d => {
        const data = d.data() as PrivateMessage;
        if (data.conversationId === conversationId) {
          msgs.push({ ...data, id: d.id });
        }
      });
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onMessages(msgs);
    },
    err => console.debug('[Firestore] Private msgs sync error:', err)
  );
}

const SEEDED_KEY = 'ben_naama_firestore_seeded_madrasati_v1';

export async function seedInitialFirestoreData(existingDocs: SchoolDocument[], existingAnns: SchoolAnnouncement[]) {
  if (isFirestoreQuotaExceeded()) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(SEEDED_KEY) === 'true') {
      return;
    }
    const snapshot = await getDocs(query(docsCol, limit(1)));
    if (snapshot.empty) {
      let docsToSeed = existingDocs;
      // If client has no docs in memory, try fetching from server /api/sync
      if (!docsToSeed || docsToSeed.length === 0) {
        try {
          const res = await fetch('/api/sync', { cache: 'no-store', credentials: 'same-origin' });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data.documents) && data.documents.length > 0) {
              docsToSeed = data.documents;
            }
          }
        } catch {
          // fallback
        }
      }

      if (docsToSeed && docsToSeed.length > 0) {
        console.log(`[Firestore] Seeding ${docsToSeed.length} initial documents to cloud database...`);
        for (const d of docsToSeed) {
          await saveDocumentToFirestore(d);
        }
      }
    }

    const annSnap = await getDocs(query(annsCol, limit(1)));
    if (annSnap.empty && existingAnns.length > 0) {
      for (const a of existingAnns) {
        await saveAnnouncementToFirestore(a);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEEDED_KEY, 'true');
    }
  } catch (err) {
    detectFirestoreQuotaError(err);
    console.warn('[Firestore] Seed check warning:', err);
  }
}

// ================= Real-Time User Presence (Online Students & Teachers) =================
export async function savePresenceHeartbeatToFirestore(record: UserPresenceRecord): Promise<void> {
  if (!record.identifier || isFirestoreQuotaExceeded()) return;
  const docId = record.identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  try {
    const cleanPayload: Record<string, unknown> = {
      identifier: record.identifier,
      name: record.name,
      role: record.role,
      lastSeen: record.lastSeen,
      isOnline: record.isOnline,
    };
    if (typeof record.lastActive === 'number') cleanPayload.lastActive = record.lastActive;
    if (record.title) cleanPayload.title = record.title;
    if (record.classId) cleanPayload.classId = record.classId;
    if (record.className) cleanPayload.className = record.className;
    await setDoc(doc(firestore, 'user_presence', docId), cleanPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `user_presence/${docId}`);
  }
}

export async function markPresenceOfflineInFirestore(identifier: string): Promise<void> {
  if (!identifier || isFirestoreQuotaExceeded()) return;
  const docId = identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  try {
    await setDoc(
      doc(firestore, 'user_presence', docId),
      {
        isOnline: false,
        lastSeen: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `user_presence/${docId}`);
  }
}

export function initPresenceRealtimeSync(
  onPresence: (records: UserPresenceRecord[]) => void
): () => void {
  if (isFirestoreQuotaExceeded()) return () => {};
  return onSnapshot(
    presenceCol,
    snapshot => {
      const records: UserPresenceRecord[] = [];
      snapshot.forEach(d => {
        const data = d.data() as Partial<UserPresenceRecord>;
        if (data && data.identifier && data.name && data.role) {
          records.push({
            identifier: data.identifier,
            name: data.name,
            role: data.role,
            title: data.title,
            classId: data.classId,
            className: data.className,
            lastSeen: typeof data.lastSeen === 'number' ? data.lastSeen : 0,
            lastActive: typeof data.lastActive === 'number' ? data.lastActive : undefined,
            isOnline: Boolean(data.isOnline),
          });
        }
      });
      onPresence(records);
    },
    err => {
      handleFirestoreError(err, OperationType.LIST, 'user_presence');
    }
  );
}

// ================= Custom Newly Added Students =================
export async function saveCustomStudentToFirestore(student: UserProfile): Promise<void> {
  if (!student.identifier || !student.activationCode) return;
  const docId = student.identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  try {
    await setDoc(
      doc(firestore, 'custom_students', docId),
      {
        id: student.id,
        identifier: student.identifier,
        name: student.name,
        role: 'student',
        classId: student.classId || '4AM-1',
        className: student.className || 'رابعة متوسط 01',
        activationCode: student.activationCode,
        title: student.title || `تلميذ(ة) بقسم ${student.className || 'رابعة متوسط 01'}`,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `custom_students/${docId}`);
  }
}

export async function fetchCustomStudentsFromFirestore(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(customStudentsCol);
    const list: UserProfile[] = [];
    snap.forEach(d => {
      const data = d.data() as Partial<UserProfile>;
      if (data && data.identifier && data.name && data.activationCode) {
        list.push({
          id: data.id || `student-${data.identifier}`,
          identifier: data.identifier,
          name: data.name,
          role: 'student',
          classId: data.classId || '4AM-1',
          className: data.className || 'رابعة متوسط 01',
          activationCode: data.activationCode,
          title: data.title || `تلميذ(ة) بقسم ${data.className || 'رابعة متوسط 01'}`,
        });
      }
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'custom_students');
    return [];
  }
}

