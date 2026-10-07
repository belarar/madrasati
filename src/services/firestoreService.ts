import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
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
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
}

// Validate connection to Firestore on initialization
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    console.log('[Firestore] Cloud database connection verified.');
    return true;
  } catch (error) {
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

let isInitialized = false;

// Real-time synchronization listeners
export function initFirestoreRealtimeSync(callbacks: {
  onDocuments: (docs: SchoolDocument[]) => void;
  onAnnouncements: (anns: SchoolAnnouncement[]) => void;
  onSummons: (summons: ParentSummon[]) => void;
  onPeerExchanges: (posts: PeerExchangePost[]) => void;
  onNotifications: (notifs: AppNotification[]) => void;
}) {
  if (isInitialized) return;
  isInitialized = true;

  testConnection().catch(() => {});
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
      callbacks.onDocuments(docs);
    },
    err => {
      console.warn('[Firestore] Documents subscription error:', err);
    }
  );

  // 2. Announcements real-time listener
  onSnapshot(
    annsCol,
    snapshot => {
      const anns: SchoolAnnouncement[] = [];
      snapshot.forEach(d => {
        anns.push({ ...(d.data() as SchoolAnnouncement), id: d.id });
      });
      anns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onAnnouncements(anns);
    },
    err => console.warn('[Firestore] Announcements subscription error:', err)
  );

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
    err => console.warn('[Firestore] Summons subscription error:', err)
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
    err => console.warn('[Firestore] Peer exchanges subscription error:', err)
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
    err => console.warn('[Firestore] Notifications subscription error:', err)
  );
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
  try {
    const docRef = doc(firestore, 'documents', docData.id);
    const downloadUrl = `/api/documents/${encodeURIComponent(docData.id)}/download`;
    const payload = sanitizeForFirestore(docData, downloadUrl);

    await setDoc(docRef, payload, { merge: true });
    console.log(`[Firestore] Document ${docData.id} saved to cloud database.`);

    // If document has a file, also save in file_chunks so full binary is always guaranteed across devices
    if (docData.fileDataUrl && typeof docData.fileDataUrl === 'string' && docData.fileDataUrl.length > 0) {
      saveFilePayloadToFirestore(docData.id, docData.fileDataUrl).catch(() => {});
    }

    // Auto-create cloud notification
    const notifId = 'notif-doc-' + Date.now();
    const notifRef = doc(firestore, 'notifications', notifId);
    const targetClassesStr = (docData.targetClasses || []).join('، ');
    await setDoc(notifRef, {
      id: notifId,
      type: 'document',
      title: `وثيقة جديدة: ${docData.title}`,
      message: `قام ${docData.authorName || 'الأستاذ'} بنشر وثيقة جديدة (${docData.subject}) موجهة إلى: ${targetClassesStr || 'الجميع'}.`,
      targetRole: docData.targetAudience === 'teachers' ? 'teachers' : 'students',
      targetClassId: docData.targetClasses && docData.targetClasses[0] !== 'ALL' ? docData.targetClasses[0] : null,
      sourceAuthorName: docData.authorName,
      sourceId: docData.id,
      createdAt: new Date().toISOString(),
      readBy: [],
    });
  } catch (err) {
    console.warn(`[Firestore] Error saving document ${docData.id}:`, err);
  }
}

export async function deleteDocumentFromFirestore(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'documents', docId));
    console.log(`[Firestore] Document ${docId} deleted from cloud database.`);
  } catch (err) {
    console.warn(`[Firestore] Error deleting document ${docId}:`, err);
  }
}

export async function incrementDownloadCountInFirestore(docId: string, currentCount: number): Promise<void> {
  try {
    const docRef = doc(firestore, 'documents', docId);
    await updateDoc(docRef, { downloadCount: (currentCount || 0) + 1 });
  } catch (err) {
    console.debug('[Firestore] Increment dl count err:', err);
  }
}

export async function saveAnnouncementToFirestore(ann: SchoolAnnouncement): Promise<void> {
  try {
    const annRef = doc(firestore, 'announcements', ann.id);
    const downloadUrl = ann.fileName ? `/api/announcements/${encodeURIComponent(ann.id)}/download` : undefined;
    const payload = sanitizeForFirestore(ann, downloadUrl);
    await setDoc(annRef, payload, { merge: true });
    console.log(`[Firestore] Announcement ${ann.id} saved to cloud database.`);

    // If announcement has an attachment, also save in file_chunks
    if (ann.fileDataUrl && typeof ann.fileDataUrl === 'string' && ann.fileDataUrl.length > 0) {
      saveFilePayloadToFirestore(ann.id, ann.fileDataUrl).catch(() => {});
    }
  } catch (err) {
    console.warn(`[Firestore] Error saving announcement ${ann.id}:`, err);
  }
}

export async function deleteAnnouncementFromFirestore(annId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'announcements', annId));
  } catch (err) {
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

export async function seedInitialFirestoreData(existingDocs: SchoolDocument[], existingAnns: SchoolAnnouncement[]) {
  try {
    const snapshot = await getDocs(docsCol);
    if (snapshot.empty) {
      let docsToSeed = existingDocs;
      // If client has no docs in memory, try fetching from server /api/sync
      if (!docsToSeed || docsToSeed.length === 0) {
        try {
          const res = await fetch('/api/sync');
          if (res.ok) {
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

    const annSnap = await getDocs(annsCol);
    if (annSnap.empty && existingAnns.length > 0) {
      for (const a of existingAnns) {
        await saveAnnouncementToFirestore(a);
      }
    }
  } catch (err) {
    console.warn('[Firestore] Seed check warning:', err);
  }
}
