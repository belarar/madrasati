import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DOCUMENTS,
  INITIAL_PEER_EXCHANGES,
  INITIAL_SUMMONS,
  MOCK_USERS,
  SCHOOL_NAME,
} from '../data/mockData';
import {
  AppNotification,
  DocType,
  FileFormat,
  ParentSummon,
  PeerExchangePost,
  PeerExchangeReply,
  PrivateConversation,
  PrivateMessage,
  SchoolAnnouncement,
  SchoolDocument,
  SubjectId,
  UserProfile,
  UserRole,
  InternalStaffSummon,
  UserPresenceRecord,
} from '../types';
import {
  OFFICIAL_STUDENTS_LIST,
  OFFICIAL_STUDENT_ACTIVATION_LIST,
  findOfficialStudentByActivationCode,
  generateUniqueStudentActivationCode,
  getStudentActivationCode,
  toUserProfile,
} from '../data/officialStudents';
import { OFFICIAL_STAFF_LIST, toStaffUserProfile } from '../data/officialStaff';
import {
  approvePasswordResetRequestInFirestore,
  deleteAnnouncementFromFirestore,
  deleteDocumentFromFirestore,
  deletePasswordResetRequestFromFirestore,
  deletePeerPostFromFirestore,
  deletePrivateConversationFromFirestore,
  deleteSummonFromFirestore,
  fetchAllStaffPinsFromFirestore,
  fetchCustomStudentsFromFirestore,
  fetchFilePayloadFromFirestore,
  fetchStaffPinFromFirestore,
  incrementDownloadCountInFirestore,
  initFirestoreRealtimeSync,
  initPresenceRealtimeSync,
  initPrivateConversationsSync,
  initPrivateMessagesSync,
  fetchPasswordResetRequestsFromFirestore,
  markPresenceOfflineInFirestore,
  rejectPasswordResetRequestInFirestore,
  resolvePendingResetRequestsForIdentifierInFirestore,
  saveAnnouncementToFirestore,
  saveCustomStudentToFirestore,
  saveDocumentToFirestore,
  savePasswordResetRequestToFirestore,
  savePeerPostToFirestore,
  savePresenceHeartbeatToFirestore,
  savePrivateConversationToFirestore,
  savePrivateMessageToFirestore,
  saveStaffPinToFirestore,
  saveSummonToFirestore,
  seedInitialFirestoreData,
} from './firestoreService';
import { getFileFromIndexedDb, saveFileToIndexedDb } from '../utils/fileStorageDb';
import { triggerNotificationAlert } from './notificationService';

export const STORAGE_KEYS = {
  CURRENT_USER: 'ben_naama_current_user',
  DOCUMENTS: 'ben_naama_documents',
  ANNOUNCEMENTS: 'ben_naama_announcements',
  SUMMONS: 'ben_naama_summons',
  INTERNAL_STAFF_SUMMONS: 'ben_naama_internal_staff_summons',
  USERS: 'ben_naama_users',
  CUSTOM_STUDENTS: 'ben_naama_custom_students',
  STAFF_PINS: 'ben_naama_staff_pins',
  PEER_EXCHANGES: 'ben_naama_peer_exchanges',
  NOTIFICATIONS: 'ben_naama_notifications',
  PRIVATE_CONVERSATIONS: 'ben_naama_private_conversations',
  PRIVATE_MESSAGES: 'ben_naama_private_messages',
  PASSWORD_RESET_REQUESTS: 'ben_naama_password_reset_requests',
};

const CLEAN_VERSION_KEY = 'ben_naama_strict_official_v16';

export interface StaffPinRecord {
  pin: string;
  updatedAt: string;
  source?: 'firestore' | 'server' | 'local';
}

// In-memory cache for live cross-device sync and local quota protection
let cachedDocuments: SchoolDocument[] | null = null;
let cachedAnnouncements: SchoolAnnouncement[] | null = null;
let cachedSummons: ParentSummon[] | null = null;
let cachedPeerExchanges: PeerExchangePost[] | null = null;
let cachedStaffPins: Record<string, StaffPinRecord> | null = null;

// Startup & spam protection for notifications
const APP_BOOT_MS = Date.now();
let initialNotifsHydrated = false;
const sessionAlertedNotifIds = new Set<string>();

export function normalizeIdentifier(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\u0660-\u0669]/g, ch => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, ch => String(ch.charCodeAt(0) - 0x06F0))
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

export function getStoredStaffPins(): Record<string, StaffPinRecord> {
  if (cachedStaffPins) return cachedStaffPins;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF_PINS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        cachedStaffPins = parsed;
        return cachedStaffPins!;
      }
    }
  } catch {}
  cachedStaffPins = {};
  return cachedStaffPins;
}

function saveStoredStaffPins(pins: Record<string, StaffPinRecord>): void {
  cachedStaffPins = pins;
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF_PINS, JSON.stringify(pins));
  } catch {}
}

export function upsertStoredStaffPin(
  identifier: string,
  pin: string,
  updatedAt?: string,
  source: 'firestore' | 'server' | 'local' = 'local'
): boolean {
  const cleanId = normalizeIdentifier(identifier);
  const cleanPin = pin ? pin.trim() : '';
  if (!cleanId || cleanPin.length < 4) return false;

  const current = { ...getStoredStaffPins() };
  const existing = current[cleanId];
  const incomingTs = updatedAt ? new Date(updatedAt).getTime() : 0;
  const existingTs = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;

  let shouldUpdate = false;
  if (!existing) {
    shouldUpdate = true;
  } else if (source === 'local') {
    shouldUpdate = true;
  } else if (incomingTs > 0 && incomingTs >= existingTs) {
    shouldUpdate = true;
  } else if (source === 'firestore' && existingTs === 0) {
    // Firestore explicit timestamp beats untimestamped legacy entries
    shouldUpdate = true;
  }

  if (!shouldUpdate && existing?.pin === cleanPin) {
    return false;
  }
  if (!shouldUpdate) {
    return false;
  }

  current[cleanId] = {
    pin: cleanPin,
    updatedAt: updatedAt || new Date().toISOString(),
    source,
  };
  saveStoredStaffPins(current);
  return true;
}

export function getEffectiveStaffPin(identifier: string, fallbackPin?: string): string | undefined {
  const cleanId = normalizeIdentifier(identifier);
  const record = getStoredStaffPins()[cleanId];
  if (record?.pin && record.pin.trim().length >= 4) {
    return record.pin.trim();
  }
  return fallbackPin && fallbackPin.trim().length >= 4 ? fallbackPin.trim() : undefined;
}

function mergePasswordResetRequests(
  baseList: PasswordResetRequest[],
  incomingList: PasswordResetRequest[]
): PasswordResetRequest[] {
  const map = new Map<string, PasswordResetRequest>();

  const applyItem = (item: PasswordResetRequest) => {
    if (!item || !item.id) return;
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
      return;
    }
    // Resolved status (approved/rejected) ALWAYS beats pending
    if (prev.status === 'pending' && item.status !== 'pending') {
      map.set(item.id, item);
      return;
    }
    if (prev.status !== 'pending' && item.status === 'pending') {
      return;
    }
    const prevTime = new Date(prev.resolvedAt || prev.requestDate).getTime();
    const itemTime = new Date(item.resolvedAt || item.requestDate).getTime();
    if (itemTime >= prevTime) {
      map.set(item.id, item);
    }
  };

  baseList.forEach(applyItem);
  incomingList.forEach(applyItem);

  const staffPins = getStoredStaffPins();
  const merged = Array.from(map.values()).map(req => {
    if (req.status === 'pending') {
      const cleanId = normalizeIdentifier(req.identifier);
      const pinRec = staffPins[cleanId];
      // If a staff pin was updated/activated AFTER or AT this pending request's time, mark it resolved
      if (pinRec?.updatedAt) {
        const pinTime = new Date(pinRec.updatedAt).getTime();
        const reqTime = new Date(req.requestDate).getTime();
        if (!Number.isNaN(pinTime) && !Number.isNaN(reqTime) && pinTime >= reqTime) {
          return { ...req, status: 'approved' as const, resolvedAt: pinRec.updatedAt };
        }
      }
    }
    return req;
  });

  merged.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  return merged;
}

// Initialize Storage with clean baseline & start cross-device sync
export function initStorage(): void {
  if (typeof window === 'undefined') return;

  // Clean old test artifacts once to guarantee a fresh, real environment
  if (localStorage.getItem(CLEAN_VERSION_KEY) !== 'true') {
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(STORAGE_KEYS.SUMMONS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.PEER_EXCHANGES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.setItem(CLEAN_VERSION_KEY, 'true');
  }

  // Populate cache on startup
  cachedDocuments = getDocuments();
  cachedAnnouncements = getAnnouncements();
  cachedSummons = getSummons();
  cachedPeerExchanges = getPeerExchanges();

  // Listen for storage events from other tabs / windows
  if (!(window as any).__benNaamaStorageListener) {
    (window as any).__benNaamaStorageListener = true;
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.DOCUMENTS) {
        cachedDocuments = null;
        window.dispatchEvent(new Event('documents-change'));
      }
      if (e.key === STORAGE_KEYS.ANNOUNCEMENTS) {
        cachedAnnouncements = null;
        window.dispatchEvent(new Event('announcements-change'));
      }
      if (e.key === STORAGE_KEYS.SUMMONS) {
        cachedSummons = null;
        window.dispatchEvent(new Event('summons-change'));
      }
      if (e.key === STORAGE_KEYS.PEER_EXCHANGES) {
        cachedPeerExchanges = null;
        window.dispatchEvent(new Event('peer-exchanges-change'));
      }
      if (e.key === STORAGE_KEYS.PRIVATE_CONVERSATIONS) {
        window.dispatchEvent(new Event('private-conversations-change'));
      }
      if (e.key === STORAGE_KEYS.PRIVATE_MESSAGES) {
        window.dispatchEvent(new Event('private-messages-change'));
      }
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        window.dispatchEvent(new Event('auth-change'));
      }
    });
  }

  // Start real-time Firestore Cloud Database Synchronization
  try {
    initFirestoreRealtimeSync({
      onDocuments: (liveDocs) => {
        if (Array.isArray(liveDocs)) {
          const prev = cachedDocuments || [];
          const merged = liveDocs.map(doc => {
            const local = prev.find(p => p.id === doc.id);
            if (local?.fileDataUrl && !doc.fileDataUrl) {
              return { ...doc, fileDataUrl: local.fileDataUrl };
            }
            return doc;
          });
          cachedDocuments = merged;
          safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(merged));
          window.dispatchEvent(new Event('documents-change'));

          // Asynchronously hydrate any missing file payloads from IndexedDB or Firestore chunks
          liveDocs.forEach(d => {
            if (!d.fileDataUrl) {
              getFileFromIndexedDb(d.id).then(stored => {
                if (stored?.dataUrl && cachedDocuments) {
                  cachedDocuments = cachedDocuments.map(item =>
                    item.id === d.id ? { ...item, fileDataUrl: stored.dataUrl } : item
                  );
                  window.dispatchEvent(new Event('documents-change'));
                }
              }).catch(() => {});
            }
          });
        }
      },
      onAnnouncements: (liveAnns) => {
        if (Array.isArray(liveAnns)) {
          const prev = cachedAnnouncements || [];
          const merged = liveAnns.map(ann => {
            const local = prev.find(p => p.id === ann.id);
            if (local?.fileDataUrl && !ann.fileDataUrl) {
              return { ...ann, fileDataUrl: local.fileDataUrl };
            }
            return ann;
          });
          cachedAnnouncements = merged;
          safeSetItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(merged));
          window.dispatchEvent(new Event('announcements-change'));

          // Asynchronously hydrate missing attachments
          liveAnns.forEach(a => {
            if (!a.fileDataUrl && a.fileName) {
              getFileFromIndexedDb(a.id).then(stored => {
                if (stored?.dataUrl && cachedAnnouncements) {
                  cachedAnnouncements = cachedAnnouncements.map(item =>
                    item.id === a.id ? { ...item, fileDataUrl: stored.dataUrl } : item
                  );
                  window.dispatchEvent(new Event('announcements-change'));
                }
              }).catch(() => {});
            }
          });
        }
      },
      onSummons: (liveSummons) => {
        if (Array.isArray(liveSummons)) {
          cachedSummons = liveSummons;
          safeSetItem(STORAGE_KEYS.SUMMONS, JSON.stringify(liveSummons));
          window.dispatchEvent(new Event('summons-change'));
        }
      },
      onPeerExchanges: (livePosts) => {
        if (Array.isArray(livePosts)) {
          cachedPeerExchanges = livePosts;
          safeSetItem(STORAGE_KEYS.PEER_EXCHANGES, JSON.stringify(livePosts));
          window.dispatchEvent(new Event('peer-exchanges-change'));
        }
      },
      onNotifications: (liveNotifs) => {
        if (Array.isArray(liveNotifs)) {
          const rawCurrent = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
          const currentNotifs: AppNotification[] = rawCurrent ? JSON.parse(rawCurrent) : [];
          const currentIds = new Set(currentNotifs.map(n => n.id));
          const brandNew = liveNotifs.filter(n => !currentIds.has(n.id));

          safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(liveNotifs));
          window.dispatchEvent(new Event('notifications-change'));

          // Only alert once for the single newest genuinely fresh notification relevant to logged-in user (no startup/archive spam)
          maybeAlertSingleFreshNotification(brandNew);
          initialNotifsHydrated = true;
        }
      },
      onPasswordResetRequests: (liveRequests) => {
        if (Array.isArray(liveRequests)) {
          const prev = getPasswordResetRequests();
          const merged = mergePasswordResetRequests(prev, liveRequests as PasswordResetRequest[]);
          const prevStr = JSON.stringify(prev.map(r => ({ id: r.id, status: r.status, pin: r.requestedPin })));
          const nextStr = JSON.stringify(merged.map(r => ({ id: r.id, status: r.status, pin: r.requestedPin })));
          if (prevStr !== nextStr) {
            safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('password-requests-updated'));
          }
          // If any approved requests exist in Firestore, ensure their PIN is also stored
          let pinChanged = false;
          liveRequests.forEach(r => {
            if (r.status === 'approved' && r.requestedPin && r.requestedPin.trim().length >= 4) {
              if (upsertStoredStaffPin(r.identifier, r.requestedPin, r.resolvedAt || r.requestDate, 'firestore')) {
                pinChanged = true;
              }
            }
          });
          if (pinChanged) {
            window.dispatchEvent(new CustomEvent('password-requests-updated'));
            window.dispatchEvent(new Event('auth-change'));
          }
        }
      },
      onStaffPins: (livePins) => {
        if (livePins && typeof livePins === 'object') {
          let pinChanged = false;
          for (const [id, rec] of Object.entries(livePins)) {
            if (rec && rec.pin && upsertStoredStaffPin(id, rec.pin, rec.updatedAt, 'firestore')) {
              pinChanged = true;
            }
          }
          const users = getAllUsers();
          let changed = false;
          const updatedUsers = users.map(u => {
            const effective = getEffectiveStaffPin(u.identifier, u.pin);
            if (effective && u.pin !== effective) {
              changed = true;
              return { ...u, pin: effective };
            }
            return u;
          });
          if (changed) {
            safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
          }
          if (changed || pinChanged) {
            // Re-evaluate pending requests against updated pin timestamps
            const currentReqs = getPasswordResetRequests();
            const reconciled = mergePasswordResetRequests(currentReqs, []);
            if (JSON.stringify(currentReqs) !== JSON.stringify(reconciled)) {
              safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(reconciled));
            }
            window.dispatchEvent(new CustomEvent('password-requests-updated'));
            window.dispatchEvent(new Event('auth-change'));
          }
        }
      },
      onCustomStudents: (liveCustomStudents) => {
        if (Array.isArray(liveCustomStudents) && liveCustomStudents.length > 0) {
          const currentCustom = getCustomStudents();
          const map = new Map<string, UserProfile>();
          for (const s of currentCustom) {
            map.set(normalizeIdentifier(s.identifier), s);
          }
          let changed = false;
          for (const incoming of liveCustomStudents) {
            const key = normalizeIdentifier(incoming.identifier);
            if (!map.has(key)) {
              map.set(key, incoming);
              changed = true;
            }
          }
          if (changed) {
            safeSetItem(STORAGE_KEYS.CUSTOM_STUDENTS, JSON.stringify(Array.from(map.values())));
            window.dispatchEvent(new Event('custom-students-change'));
            window.dispatchEvent(new Event('auth-change'));
          }
        }
      },
    });

    // Seed baseline data to cloud database if empty
    seedInitialFirestoreData(getDocuments(), getAnnouncements()).catch(() => {});
  } catch (err) {
    console.debug('[Firestore] Sync init note:', err);
  }

  // Start real-time server synchronization across devices
  syncWithServer();
  if (!(window as any).__benNaamaSyncInterval) {
    (window as any).__benNaamaSyncInterval = setInterval(syncWithServer, 2500);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncWithServer();
      }
    });
    window.addEventListener('online', () => {
      syncWithServer();
    });
    window.addEventListener('offline', () => {
      updateSyncStatus('offline');
    });
  }
}

// User Profile & Authentication
export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null; // Clean guest state - user must log in
    const user: UserProfile = JSON.parse(raw);

    // If staff member, synchronize with latest official rank & title & classes
    const officialStaff = OFFICIAL_STAFF_LIST.find(s => s.identifier === user.identifier);
    if (officialStaff) {
      const fresh = toStaffUserProfile(officialStaff);
      user.name = fresh.name;
      user.title = fresh.title;
      user.role = fresh.role;
      user.subjects = fresh.subjects;
      user.assignedClasses = fresh.assignedClasses;
      user.rank = fresh.rank;
    } else if (user.role !== 'student') {
      // If user was removed from official list (e.g. replaced staff), log them out
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
  window.dispatchEvent(new Event('auth-change'));
}

export function getCustomStudents(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_STUDENTS);
    if (!raw) return [];
    const parsed: UserProfile[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(u => u && u.role === 'student' && u.identifier) : [];
  } catch {
    return [];
  }
}

export function getAllUsers(): UserProfile[] {
  const applyOverrides = (list: UserProfile[]) =>
    list.map(u => {
      if (u.role === 'student') {
        const officialCode = getStudentActivationCode(u.identifier);
        return officialCode && u.activationCode !== officialCode
          ? { ...u, activationCode: officialCode }
          : u;
      }
      const effectivePin = getEffectiveStaffPin(u.identifier, u.pin);
      return effectivePin && effectivePin !== u.pin ? { ...u, pin: effectivePin } : u;
    });

  const customStudents = getCustomStudents();

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      const existingIds = new Set(MOCK_USERS.map(u => u.identifier));
      const extraCustom = customStudents.filter(c => !existingIds.has(c.identifier));
      return applyOverrides([...MOCK_USERS, ...extraCustom]);
    }
    const parsed: UserProfile[] = JSON.parse(raw);

    // Strictly retain official staff, official students, and director-added custom students
    const officialStaffIds = new Set(OFFICIAL_STAFF_LIST.map(s => s.identifier));
    const officialStudentIds = new Set(OFFICIAL_STUDENTS_LIST.map(s => s.identifier));
    const customStudentIds = new Set(customStudents.map(s => s.identifier));

    const validUsers = parsed.filter(
      u =>
        officialStaffIds.has(u.identifier) ||
        officialStudentIds.has(u.identifier) ||
        (u.role === 'student' && customStudentIds.has(u.identifier))
    );

    // Sync official staff members and student activation codes
    const staffMap = new Map(OFFICIAL_STAFF_LIST.map(s => [s.identifier, s]));
    const syncedUsers = validUsers.map(u => {
      const match = staffMap.get(u.identifier);
      if (match) {
        const fresh = toStaffUserProfile(match);
        const effectivePin = getEffectiveStaffPin(u.identifier, u.pin || fresh.pin);
        return {
          ...u,
          name: fresh.name,
          role: fresh.role,
          title: fresh.title,
          subjects: fresh.subjects,
          assignedClasses: fresh.assignedClasses,
          rank: fresh.rank,
          pin: effectivePin,
        };
      }
      if (u.role === 'student') {
        const officialCode = getStudentActivationCode(u.identifier);
        if (officialCode && u.activationCode !== officialCode) {
          return { ...u, activationCode: officialCode };
        }
      }
      return u;
    });

    // Ensure all official users (staff + students) + custom students are present
    const storedIds = new Set(syncedUsers.map(u => u.identifier));
    const missingOfficial = applyOverrides(MOCK_USERS.filter(u => !storedIds.has(u.identifier)));
    const missingCustom = customStudents.filter(c => !storedIds.has(c.identifier));

    return [...syncedUsers, ...missingOfficial, ...missingCustom];
  } catch {
    return applyOverrides([...MOCK_USERS, ...customStudents]);
  }
}

export interface StudentActivationDirectoryEntry {
  order: number;
  regNumber: number;
  identifier: string;
  name: string;
  surname: string;
  firstName: string;
  gender?: 'ذكر' | 'أنثى';
  birthDate?: string;
  classId: string;
  className: string;
  activationCode: string;
  isCustom?: boolean;
}

export function getStudentActivationDirectory(): StudentActivationDirectoryEntry[] {
  const officialEntries: StudentActivationDirectoryEntry[] = OFFICIAL_STUDENT_ACTIVATION_LIST.map(s => ({
    order: s.order,
    regNumber: s.regNumber,
    identifier: s.identifier,
    name: `${s.surname} ${s.firstName}`,
    surname: s.surname,
    firstName: s.firstName,
    gender: s.gender,
    birthDate: s.birthDate,
    classId: s.classId,
    className: s.className,
    activationCode: s.activationCode,
  }));

  const officialIds = new Set(officialEntries.map(e => e.identifier));
  const usedCodes = new Set(officialEntries.map(e => e.activationCode));
  const customStudents = getCustomStudents().filter(c => !officialIds.has(c.identifier));

  let nextReg = officialEntries.length + 1;
  const customEntries: StudentActivationDirectoryEntry[] = customStudents.map((c, idx) => {
    const code =
      c.activationCode && /^\d{6}$/.test(c.activationCode) && !usedCodes.has(c.activationCode)
        ? c.activationCode
        : generateUniqueStudentActivationCode(`CUSTOM::${c.identifier}`, usedCodes);
    usedCodes.add(code);
    const parts = c.name.trim().split(/\s+/);
    return {
      order: idx + 1,
      regNumber: nextReg++,
      identifier: c.identifier,
      name: c.name,
      surname: parts[0] || c.name,
      firstName: parts.slice(1).join(' ') || '',
      classId: c.classId || '4AM-1',
      className: c.className || 'رابعة متوسط 01',
      activationCode: code,
      isCustom: true,
    };
  });

  return [...officialEntries, ...customEntries];
}

export function addCustomStudent(params: {
  identifier: string;
  name: string;
  classId: string;
  className: string;
}): UserProfile {
  const cleanId = normalizeIdentifier(params.identifier) || params.identifier.trim();
  const officialMatch = OFFICIAL_STUDENTS_LIST.find(
    s => normalizeIdentifier(s.identifier) === cleanId
  );
  if (officialMatch) {
    return toUserProfile(officialMatch);
  }

  const usedCodes = new Set<string>(
    OFFICIAL_STUDENT_ACTIVATION_LIST.map(s => s.activationCode)
  );
  const existingCustom = getCustomStudents();
  for (const c of existingCustom) {
    if (c.activationCode) usedCodes.add(c.activationCode);
  }

  const existingCustomRecord = existingCustom.find(
    c => normalizeIdentifier(c.identifier) === cleanId
  );
  const activationCode =
    existingCustomRecord?.activationCode && /^\d{6}$/.test(existingCustomRecord.activationCode)
      ? existingCustomRecord.activationCode
      : generateUniqueStudentActivationCode(`CUSTOM::${cleanId}::${params.classId}`, usedCodes);

  const studentUser: UserProfile = {
    id: 'student-' + cleanId,
    identifier: params.identifier.trim(),
    activationCode,
    name: params.name.trim(),
    role: 'student',
    classId: params.classId,
    className: params.className,
    title: `تلميذ(ة) بقسم ${params.className}`,
  };

  const nextCustom = existingCustomRecord
    ? existingCustom.map(c => (normalizeIdentifier(c.identifier) === cleanId ? studentUser : c))
    : [...existingCustom, studentUser];
  safeSetItem(STORAGE_KEYS.CUSTOM_STUDENTS, JSON.stringify(nextCustom));

  const users = getAllUsers();
  const existsInUsers = users.some(u => normalizeIdentifier(u.identifier) === cleanId);
  const updatedUsers = existsInUsers
    ? users.map(u => (normalizeIdentifier(u.identifier) === cleanId ? studentUser : u))
    : [studentUser, ...users];
  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

  // Persist across all devices via Cloud Firestore & Express backend
  saveCustomStudentToFirestore(studentUser).catch(() => {});
  fetch('/api/custom-students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentUser),
  }).catch(() => {});

  window.dispatchEvent(new Event('custom-students-change'));
  window.dispatchEvent(new Event('auth-change'));
  return studentUser;
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '') // tatweel
    .replace(/[\u064B-\u065F]/g, '') // tashkeel
    .replace(/[ـ\-_.]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Student authentication strictly via personal 6-digit activation code
export function authenticateStudentByActivationCode(
  rawCode: string
): { success: boolean; user?: UserProfile; message?: string } {
  const normalized = normalizeIdentifier(rawCode || '').replace(/[^0-9a-z]/g, '');

  if (!normalized) {
    return {
      success: false,
      message: '⛔ يرجى إدخال رمز التفعيل الشخصي المكون من 6 أرقام.',
    };
  }

  if (!/^\d{6}$/.test(normalized)) {
    return {
      success: false,
      message: '⛔ رمز التفعيل يجب أن يتكون من 6 أرقام بالضبط. يرجى التأكد من الرمز المسلم لك من طرف إدارة المؤسسة.',
    };
  }

  // 1. Lookup in the 393 official students registry
  const officialMatch = findOfficialStudentByActivationCode(normalized);
  if (officialMatch) {
    const user = toUserProfile(officialMatch);
    registerNewUser(user);
    setCurrentUser(user);
    return { success: true, user };
  }

  // 2. Fallback: Lookup in custom-added students (if Director added a new student)
  const directoryMatch = getStudentActivationDirectory().find(
    s => s.activationCode === normalized
  );
  if (directoryMatch) {
    const customUser: UserProfile = {
      id: 'student-' + directoryMatch.identifier,
      identifier: directoryMatch.identifier,
      activationCode: directoryMatch.activationCode,
      name: directoryMatch.name,
      role: 'student',
      classId: directoryMatch.classId,
      className: directoryMatch.className,
      title: `تلميذ(ة) بقسم ${directoryMatch.className}`,
    };
    registerNewUser(customUser);
    setCurrentUser(customUser);
    return { success: true, user: customUser };
  }

  return {
    success: false,
    message: `⛔ رمز التفعيل (${normalized}) غير صحيح أو غير مسجل في قائمة رموز تلاميذ متوسطة الشهيد بن نعمة مصطفى. يرجى التثبت من الرمز المسلم لك من الإدارة أو الناظرة.`,
  };
}

export async function authenticateStudentByActivationCodeAsync(
  rawCode: string
): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
  const localAttempt = authenticateStudentByActivationCode(rawCode);
  if (localAttempt.success) return localAttempt;

  const normalized = normalizeIdentifier(rawCode || '').replace(/[^0-9a-z]/g, '');
  if (!/^\d{6}$/.test(normalized)) return localAttempt;

  // Fetch latest custom-added students from Firestore & Server in case Director added student on another device
  try {
    const [firestoreList, serverList] = await Promise.all([
      fetchCustomStudentsFromFirestore().catch(() => [] as UserProfile[]),
      fetch('/api/custom-students')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => [] as UserProfile[]),
    ]);

    const combined = [...(Array.isArray(firestoreList) ? firestoreList : []), ...(Array.isArray(serverList) ? serverList : [])];
    if (combined.length > 0) {
      const existing = getCustomStudents();
      const map = new Map<string, UserProfile>();
      for (const s of existing) map.set(normalizeIdentifier(s.identifier), s);
      let changed = false;
      for (const incoming of combined) {
        if (incoming && incoming.identifier && incoming.activationCode) {
          const key = normalizeIdentifier(incoming.identifier);
          if (!map.has(key)) {
            map.set(key, incoming);
            changed = true;
          }
        }
      }
      if (changed) {
        safeSetItem(STORAGE_KEYS.CUSTOM_STUDENTS, JSON.stringify(Array.from(map.values())));
        window.dispatchEvent(new Event('custom-students-change'));
        window.dispatchEvent(new Event('auth-change'));
      }
    }
  } catch {
    // Fallback to local result
  }

  return authenticateStudentByActivationCode(rawCode);
}

// Legacy dual authentication kept exported for compatibility
export function authenticateOfficialStudent(criteria: {
  identifier?: string;
  surname?: string;
  firstName?: string;
  fullName?: string;
  classId?: string;
}): { success: boolean; user?: UserProfile; message?: string } {
  const cleanId = criteria.identifier?.trim().replace(/\s+/g, '') || '';
  const rawInput = [criteria.fullName, criteria.surname, criteria.firstName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const normInput = normalizeArabic(rawInput);

  if (!cleanId) {
    return {
      success: false,
      message: '⛔ يرجى إدخال رقم التعريف المدرسي (16 رقماً) الخاص بك.',
    };
  }

  if (!normInput) {
    return {
      success: false,
      message: '⛔ يرجى إدخال اللقب والاسم الخاص بك للتأكد من هويتك ومنع دخول أي تلميذ آخر.',
    };
  }

  const officialMatch = OFFICIAL_STUDENTS_LIST.find(s => s.identifier === cleanId);
  const registeredMatch = getAllUsers().find(u => u.role === 'student' && u.identifier === cleanId);

  if (!officialMatch && !registeredMatch) {
    return {
      success: false,
      message: `⛔ رقم التعريف المدرسي (${cleanId}) غير مسجل في سجلات متوسطة الشهيد بن نعمة مصطفى. يرجى التأكد من الرقم المكون من 16 رقماً كما في الشهادة المدرسية أو كشف النقاط.`,
    };
  }

  const expectedSurname = officialMatch ? officialMatch.surname : (registeredMatch?.name.split(' ')[0] || '');
  const expectedFirstName = officialMatch ? officialMatch.firstName : (registeredMatch?.name.split(' ').slice(1).join(' ') || '');
  const expectedFullName = officialMatch ? `${officialMatch.surname} ${officialMatch.firstName}` : registeredMatch!.name;

  const normExpectedFull = normalizeArabic(expectedFullName);
  const normExpectedSurname = normalizeArabic(expectedSurname);
  const normExpectedFirst = normalizeArabic(expectedFirstName);

  const normEnteredSurname = normalizeArabic(criteria.surname || '');
  const normEnteredFirst = normalizeArabic(criteria.firstName || '');

  const isFullMatch = normInput === normExpectedFull || normInput.replace(/\s/g, '') === normExpectedFull.replace(/\s/g, '');
  const isFieldMatch =
    (normEnteredSurname === normExpectedSurname && normEnteredFirst === normExpectedFirst) ||
    (normEnteredSurname === normExpectedFirst && normEnteredFirst === normExpectedSurname);
  const inputTokens = normInput.split(' ').filter(t => t.length > 0);
  const expectedTokens = normExpectedFull.split(' ').filter(t => t.length > 0);
  const isTokenMatch =
    inputTokens.length >= 2 &&
    inputTokens.every(tok => expectedTokens.some(et => et.includes(tok) || tok.includes(et)));

  const isNameVerified = isFullMatch || isFieldMatch || isTokenMatch;

  if (!isNameVerified) {
    return {
      success: false,
      message: `⛔ عدم تطابق البيانات: اللقب والاسم المدخلان (${rawInput}) لا يتطابقان مع صاحب رقم التعريف المدرسي (${cleanId}). تم منع الدخول لحماية أمان وخصوصية الحساب.`,
    };
  }

  const user = officialMatch ? toUserProfile(officialMatch) : registeredMatch!;
  registerNewUser(user);
  setCurrentUser(user);
  return { success: true, user };
}

export function registerNewUser(newUser: UserProfile): UserProfile {
  const users = getAllUsers();
  const exists = users.some(u => u.identifier.toLowerCase() === newUser.identifier.toLowerCase());
  
  const updated = exists
    ? users.map(u => (u.identifier.toLowerCase() === newUser.identifier.toLowerCase() ? newUser : u))
    : [newUser, ...users];

  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
  if (newUser.role !== 'student' && newUser.pin && newUser.pin.trim().length >= 4) {
    upsertStoredStaffPin(newUser.identifier, newUser.pin.trim(), new Date().toISOString(), 'local');
  }
  setCurrentUser(newUser);
  window.dispatchEvent(new Event('auth-change'));
  return newUser;
}

export function loginOrRegisterStudent(
  identifier: string,
  fullName: string,
  classId: string,
  className?: string
): UserProfile {
  const users = getAllUsers();
  const cleanId = identifier.trim();
  const existingIdx = users.findIndex(u => u.identifier.toLowerCase() === cleanId.toLowerCase());

  const studentUser: UserProfile = {
    id: existingIdx >= 0 ? users[existingIdx].id : 'student-' + cleanId,
    identifier: cleanId,
    name: fullName.trim(),
    role: 'student',
    classId: classId,
    className: className || 'السنة الرابعة متوسط (فوج 1)',
    title: `تلميذ بقسم ${className || 'الطور المتوسط'}`,
  };

  const updatedUsers = existingIdx >= 0
    ? users.map((u, i) => (i === existingIdx ? studentUser : u))
    : [studentUser, ...users];

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  setCurrentUser(studentUser);
  window.dispatchEvent(new Event('auth-change'));
  return studentUser;
}

export function loginOrRegisterStaff(
  identifier: string,
  fullName: string,
  role: UserRole,
  roleTitle: string,
  pin: string
): UserProfile {
  const users = getAllUsers();
  const cleanId = identifier.trim();

  // If 1097448010036800, role is Director
  const actualRole: UserRole = cleanId === '1097448010036800' ? 'director' : role;

  const existingIdx = users.findIndex(u => u.identifier.toLowerCase() === cleanId.toLowerCase());
  const cleanPin = pin ? pin.trim() : '';

  const officialMatch = OFFICIAL_STAFF_LIST.find(s => s.identifier.toLowerCase() === cleanId.toLowerCase());
    const fallbackTitle = officialMatch
      ? toStaffUserProfile(officialMatch).title
      : actualRole === 'director'
      ? 'مدير متوسطة الشهيد بن نعمة مصطفى'
      : roleTitle || 'موظف بالمؤسسة';
    const fallbackName = officialMatch
      ? `${officialMatch.surname} ${officialMatch.firstName}`
      : fullName.trim() || (actualRole === 'director' ? 'مدير المؤسسة' : 'موظف بالمؤسسة');

    const staffUser: UserProfile = {
      id: existingIdx >= 0 ? users[existingIdx].id : `${actualRole}-${cleanId}`,
      identifier: cleanId,
      name: fallbackName,
      role: officialMatch ? officialMatch.role : actualRole,
      pin: cleanPin || (existingIdx >= 0 ? users[existingIdx].pin : undefined),
      title: fallbackTitle,
      subjects: officialMatch?.subjectId ? [officialMatch.subjectId] : undefined,
    };

    const updatedUsers = existingIdx >= 0
      ? users.map((u, i) => (i === existingIdx ? staffUser : u))
      : [staffUser, ...users];

    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    setCurrentUser(staffUser);
    window.dispatchEvent(new Event('auth-change'));
    return staffUser;
  }

  export function authenticateUser(identifier: string, pin?: string): {
    success: boolean;
    user?: UserProfile;
    message?: string;
    notFound?: boolean;
    enteredIdentifier?: string;
  } {
    const cleanId = normalizeIdentifier(identifier);

    if (!cleanId) {
      return {
        success: false,
        message: 'يرجى إدخال رقم التعريف المهني أو المدرسي للمتابعة.',
      };
    }

    const users = getAllUsers();

    // 1. Check if identifier is in OFFICIAL_STAFF_LIST (All official professors & administration)
    const officialStaff = OFFICIAL_STAFF_LIST.find(
      s => normalizeIdentifier(s.identifier) === cleanId || s.identifier === identifier.trim()
    );
    const existingStaffUser = users.find(u => normalizeIdentifier(u.identifier) === cleanId);

    if (officialStaff || (existingStaffUser && existingStaffUser.role !== 'student')) {
      const freshProfile = officialStaff ? toStaffUserProfile(officialStaff) : undefined;
      const staffUser: UserProfile = existingStaffUser
        ? {
            ...existingStaffUser,
            ...(freshProfile
              ? {
                  name: freshProfile.name,
                  role: freshProfile.role,
                  title: freshProfile.title,
                  subjects: freshProfile.subjects,
                  assignedClasses: freshProfile.assignedClasses,
                  rank: freshProfile.rank,
                }
              : {}),
          }
        : freshProfile!;
      const enteredPin = pin ? pin.trim() : '';

    if (!enteredPin) {
      return {
        success: false,
        message: 'يرجى إدخال كلمة السر الخاصة بك للمتابعة (من 4 خانات فما فوق).',
      };
    }

    if (enteredPin.length < 4) {
      return {
        success: false,
        message: 'كلمة السر يجب أن تتكون من 4 خانات على الأقل.',
      };
    }

    const pinRecord = getStoredStaffPins()[cleanId];
    const pinUpdatedAtMs = pinRecord?.updatedAt ? new Date(pinRecord.updatedAt).getTime() : 0;
    let effectivePin = getEffectiveStaffPin(cleanId, staffUser.pin);

    // Check latest approved request in case staff_pins sync lagged behind password_reset_requests
    const allReqs = getPasswordResetRequests();
    const userReqs = allReqs.filter(r => normalizeIdentifier(r.identifier) === cleanId);
    const latestApprovedReq = userReqs.find(r => r.status === 'approved');
    if (latestApprovedReq && latestApprovedReq.requestedPin?.trim().length >= 4) {
      const approvedMs = new Date(latestApprovedReq.resolvedAt || latestApprovedReq.requestDate).getTime();
      if (!effectivePin || (approvedMs > pinUpdatedAtMs && approvedMs > 0)) {
        effectivePin = latestApprovedReq.requestedPin.trim();
        upsertStoredStaffPin(cleanId, effectivePin, latestApprovedReq.resolvedAt || latestApprovedReq.requestDate, 'firestore');
      }
    }

    // Only consider a pending request active if it was created AFTER the latest PIN activation/update
    const activePendingReq = userReqs.find(r => {
      if (r.status !== 'pending') return false;
      const reqMs = new Date(r.requestDate).getTime();
      if (pinUpdatedAtMs > 0 && !Number.isNaN(reqMs) && pinUpdatedAtMs >= reqMs) {
        return false;
      }
      return true;
    });

    if (activePendingReq && enteredPin === activePendingReq.requestedPin.trim()) {
      return {
        success: false,
        message:
          '⏳ طلب إعادة تعيين كلمة السر قيد المراجعة: لقد تم تسجيل طلبك لاختيار كلمة سر جديدة بنجاح، لكن الحساب بانتظار موافقة وتفعيل السيد المدير شخصياً لحماية حسابك من الاختراق. يُرجى التواصل مع إدارة المؤسسة لتفعيل حسابك.',
      };
    }

    if (effectivePin) {
      if (enteredPin !== effectivePin) {
        if (activePendingReq) {
          return {
            success: false,
            message:
              '⚠️ تنبيه أمان: يوجد طلب إعادة تعيين كلمة سر معلق لهذا الحساب وبانتظار موافقة وتفعيل السيد المدير. لن يتم تفعيل الدخول حتى يصادق المدير على طلبك.',
          };
        }
        return {
          success: false,
          message:
            '⛔ كلمة السر غير صحيحة. يرجى التأكد من كتابة كلمة السر بدقة، أو الضغط على "طلب إعادة تعيين كلمة السر" أسفل الشاشة لطلب تفعيلها من المدير.',
        };
      }
      staffUser.pin = effectivePin;
    } else {
      // First-time login for this official staff member:
      // Save this chosen password (4+ chars) as their personal official password across local, cloud & server!
      const nowIso = new Date().toISOString();
      staffUser.pin = enteredPin;
      upsertStoredStaffPin(cleanId, enteredPin, nowIso, 'local');
      saveStaffPinToFirestore(staffUser.identifier, enteredPin, nowIso).catch(() => {});
      fetch('/api/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: staffUser.identifier, pin: enteredPin, updatedAt: nowIso }),
      }).catch(() => {});
    }

    registerNewUser(staffUser);
    setCurrentUser(staffUser);
    return { success: true, user: staffUser };
  }

  // 2. Check if identifier is an enrolled official student in OFFICIAL_STUDENTS_LIST
  const officialStudent = OFFICIAL_STUDENTS_LIST.find(
    s => normalizeIdentifier(s.identifier) === cleanId || s.identifier === identifier.trim()
  );
  if (officialStudent) {
    const studentUser = toUserProfile(officialStudent);
    registerNewUser(studentUser);
    setCurrentUser(studentUser);
    return { success: true, user: studentUser };
  }

  // 3. STRICT REJECTION: Neither registered staff nor enrolled student!
  return {
    success: false,
    notFound: true,
    enteredIdentifier: identifier.trim(),
    message:
      '⛔ عذراً، رقم التعريف المدخل غير مسجل في السجلات الرسمية لمتوسطة الشهيد بن نعمة مصطفى. لا يُسمح بالدخول إلى المنصة إلا للتلاميذ المسجلين رسمياً والموظفين المعتمدين.',
  };
}

// Live cloud + server verification before authenticating staff so Director approvals take effect immediately across devices
export async function authenticateUserAsync(
  identifier: string,
  pin?: string
): Promise<{
  success: boolean;
  user?: UserProfile;
  message?: string;
  notFound?: boolean;
  enteredIdentifier?: string;
}> {
  const cleanId = normalizeIdentifier(identifier);
  if (cleanId) {
    const syncTasks = Promise.allSettled([
      fetchStaffPinFromFirestore(cleanId).then(rec => {
        if (rec && rec.pin) {
          upsertStoredStaffPin(cleanId, rec.pin, rec.updatedAt, 'firestore');
        }
      }),
      fetchPasswordResetRequestsFromServer(),
      fetch('/api/sync')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (!data || typeof data !== 'object') return;
          if (data.userCustomPins && typeof data.userCustomPins === 'object') {
            const customPin = data.userCustomPins[cleanId];
            const ts = data.userCustomPinTimestamps?.[cleanId];
            if (customPin && typeof customPin === 'string') {
              upsertStoredStaffPin(cleanId, customPin, ts, 'server');
            }
          }
          if (Array.isArray(data.passwordResetRequests)) {
            const merged = mergePasswordResetRequests(
              getPasswordResetRequests(),
              data.passwordResetRequests
            );
            safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(merged));
          }
        }),
    ]);

    // Guard against slow/offline network so login never hangs
    await Promise.race([
      syncTasks,
      new Promise<void>(resolve => setTimeout(resolve, 3500)),
    ]);
  }

  return authenticateUser(identifier, pin);
}

// Safe localStorage setter with QuotaExceeded fallback protection
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    let toStore = value;
    if (key === STORAGE_KEYS.DOCUMENTS || key === STORAGE_KEYS.ANNOUNCEMENTS) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // Never store heavy base64 file data URLs in localStorage to prevent QuotaExceededError
          const stripped = parsed.map(d => {
            if (d && d.fileDataUrl && d.fileDataUrl.length > 200) {
              return { ...d, fileDataUrl: undefined };
            }
            return d;
          });
          toStore = JSON.stringify(stripped);
        }
      } catch {
        // Ignored
      }
    }
    localStorage.setItem(key, toStore);
    return true;
  } catch (err: unknown) {
    console.warn(`[Storage] مساحة التخزين ممتلئة للمفتاح ${key}. يتم تنظيف المرفقات للحفاظ على الاستقرار.`);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // Strip all base64 strings to stay within quota
        const trimmed = parsed.map(item => {
          if (item && item.fileDataUrl) {
            return { ...item, fileDataUrl: undefined };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  }
}

// Documents
export function getDocuments(): SchoolDocument[] {
  // If in-memory cache already has documents, prefer it (contains fresh data & in-memory file data)
  if (cachedDocuments && cachedDocuments.length > 0) {
    return cachedDocuments;
  }
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedDocuments = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.debug('Error reading local documents:', err);
  }
  return cachedDocuments && cachedDocuments.length > 0 ? cachedDocuments : INITIAL_DOCUMENTS;
}

export function saveDocument(doc: Omit<SchoolDocument, 'id' | 'uploadDate' | 'downloadCount'>): SchoolDocument {
  const docs = getDocuments();
  const targetClasses = Array.isArray(doc.targetClasses) && doc.targetClasses.length > 0 ? doc.targetClasses : ['ALL'];
  const newDoc: SchoolDocument = {
    ...doc,
    id: 'doc-' + Date.now(),
    uploadDate: new Date().toISOString(),
    downloadCount: 0,
    targetClasses,
    targetAudience: doc.targetAudience || (targetClasses.includes('ALL') ? 'all_students' : 'specific_class'),
  };

  const updated = [newDoc, ...docs.filter(d => d.id !== newDoc.id)];
  cachedDocuments = updated;
  safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('documents-change'));

  // Save full binary payload to persistent IndexedDB
  if (newDoc.fileDataUrl) {
    saveFileToIndexedDb(
      newDoc.id,
      newDoc.fileDataUrl,
      newDoc.fileName || '',
      newDoc.fileFormat || 'pdf',
      newDoc.fileSize || ''
    ).catch(() => {});
  }

  // Auto-generate notification for target classes / students
  const targetClassesStr = (newDoc.targetClasses || []).join('، ');
  const docNotif: AppNotification = {
    id: 'notif-doc-' + Date.now(),
    type: 'document',
    title: `وثيقة جديدة: ${newDoc.title}`,
    message: `قام ${newDoc.authorName || 'الأستاذ'} بنشر وثيقة جديدة (${newDoc.subject || 'مادة'}) موجهة إلى: ${targetClassesStr || 'الجميع'}.`,
    targetRole: newDoc.targetAudience === 'teachers' ? 'teachers' : 'students',
    targetClassId: (newDoc.targetClasses && newDoc.targetClasses[0] !== 'ALL') ? newDoc.targetClasses[0] : undefined,
    sourceAuthorName: newDoc.authorName || 'الأستاذ',
    sourceId: newDoc.id,
    createdAt: new Date().toISOString(),
    readBy: [],
  };
  addNotificationLocally(docNotif, true);

  // 1. Direct Cloud Database Save (Firebase Firestore)
  saveDocumentToFirestore(newDoc).catch(err => {
    console.warn('[Firestore] Cloud save document error:', err);
  });

  // 2. Sync to local backend server
  fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newDoc),
  })
    .then(async res => {
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          syncWithServer();
        }
      }
    })
    .catch(err => console.debug('[Sync] Document post err:', err));

  return newDoc;
}

export function deleteDocument(docId: string): void {
  const docs = getDocuments();
  const updated = docs.filter(d => d.id !== docId);
  cachedDocuments = updated;
  safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('documents-change'));

  // 1. Direct Cloud Database Delete (Firebase Firestore)
  deleteDocumentFromFirestore(docId).catch(err => {
    console.warn('[Firestore] Cloud delete document error:', err);
  });

  // 2. Delete from server
  fetch('/api/documents/' + encodeURIComponent(docId), {
    method: 'DELETE',
  }).catch(() => {});
}

export function incrementDownloadCount(docId: string): void {
  const docs = getDocuments();
  const targetDoc = docs.find(d => d.id === docId);
  const updated = docs.map(d => (d.id === docId ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d));
  cachedDocuments = updated;
  safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('documents-change'));

  if (targetDoc) {
    incrementDownloadCountInFirestore(docId, targetDoc.downloadCount || 0);
  }
}

export function triggerBrowserDownload(urlOrData: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = urlOrData;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Load full binary file on demand (IndexedDB -> Cloud Firestore chunks -> Server)
export async function ensureDocumentFileDataUrl(doc: SchoolDocument): Promise<string | null> {
  if (doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
    return doc.fileDataUrl;
  }

  // 1. Check IndexedDB
  try {
    const fromIdb = await getFileFromIndexedDb(doc.id);
    if (fromIdb?.dataUrl) {
      doc.fileDataUrl = fromIdb.dataUrl;
      return fromIdb.dataUrl;
    }
  } catch {}

  // 2. Check Cloud Firestore chunks
  try {
    const fromCloud = await fetchFilePayloadFromFirestore(doc.id);
    if (fromCloud) {
      doc.fileDataUrl = fromCloud;
      saveFileToIndexedDb(doc.id, fromCloud, doc.fileName || '', doc.fileFormat || 'pdf', doc.fileSize || '');
      return fromCloud;
    }
  } catch {}

  // 3. Fallback to Server API blob
  try {
    const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}/download`);
    if (res.ok) {
      const blob = await res.blob();
      const reader = new FileReader();
      return new Promise(resolve => {
        reader.onload = () => {
          const resUrl = reader.result as string;
          doc.fileDataUrl = resUrl;
          saveFileToIndexedDb(doc.id, resUrl, doc.fileName || '', doc.fileFormat || 'pdf', doc.fileSize || '');
          resolve(resUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {}

  return null;
}

export async function ensureAnnouncementFileDataUrl(ann: SchoolAnnouncement): Promise<string | null> {
  if (ann.fileDataUrl && ann.fileDataUrl.startsWith('data:')) {
    return ann.fileDataUrl;
  }

  // 1. Check IndexedDB
  try {
    const fromIdb = await getFileFromIndexedDb(ann.id);
    if (fromIdb?.dataUrl) {
      ann.fileDataUrl = fromIdb.dataUrl;
      return fromIdb.dataUrl;
    }
  } catch {}

  // 2. Check Cloud Firestore chunks
  try {
    const fromCloud = await fetchFilePayloadFromFirestore(ann.id);
    if (fromCloud) {
      ann.fileDataUrl = fromCloud;
      saveFileToIndexedDb(ann.id, fromCloud, ann.fileName || '', ann.fileFormat || 'pdf', ann.fileSize || '');
      return fromCloud;
    }
  } catch {}

  // 3. Server download
  try {
    const res = await fetch(`/api/announcements/${encodeURIComponent(ann.id)}/download`);
    if (res.ok) {
      const blob = await res.blob();
      const reader = new FileReader();
      return new Promise(resolve => {
        reader.onload = () => {
          const resUrl = reader.result as string;
          ann.fileDataUrl = resUrl;
          saveFileToIndexedDb(ann.id, resUrl, ann.fileName || '', ann.fileFormat || 'pdf', ann.fileSize || '');
          resolve(resUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {}

  return null;
}

// Real downloadable file generator & streaming server downloader
export async function downloadFile(doc: SchoolDocument): Promise<void> {
  incrementDownloadCount(doc.id);
  const targetFilename = doc.fileName || `${doc.title}.${doc.fileFormat || 'pdf'}`;

  // 1. If doc has explicit data URL in memory
  if (doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
    triggerBrowserDownload(doc.fileDataUrl, targetFilename);
    return;
  }

  // 2. Try IndexedDB
  try {
    const fromIdb = await getFileFromIndexedDb(doc.id);
    if (fromIdb?.dataUrl) {
      doc.fileDataUrl = fromIdb.dataUrl;
      triggerBrowserDownload(fromIdb.dataUrl, targetFilename);
      return;
    }
  } catch {}

  // 3. Try Cloud Firestore chunks
  try {
    const fromCloud = await fetchFilePayloadFromFirestore(doc.id);
    if (fromCloud) {
      doc.fileDataUrl = fromCloud;
      saveFileToIndexedDb(doc.id, fromCloud, doc.fileName || '', doc.fileFormat || 'pdf', doc.fileSize || '');
      triggerBrowserDownload(fromCloud, targetFilename);
      return;
    }
  } catch {}

  // 4. Direct server-side streaming download
  const serverDownloadUrl = `/api/documents/${encodeURIComponent(doc.id)}/download`;
  triggerBrowserDownload(serverDownloadUrl, targetFilename);
}

// Download announcement attachment
export async function downloadAnnouncementAttachment(ann: SchoolAnnouncement): Promise<void> {
  const targetFilename = ann.fileName || `${ann.title}.${ann.fileFormat || 'pdf'}`;

  // 1. If explicit data URL in memory
  if (ann.fileDataUrl && ann.fileDataUrl.startsWith('data:')) {
    triggerBrowserDownload(ann.fileDataUrl, targetFilename);
    return;
  }

  // 2. Try IndexedDB
  try {
    const fromIdb = await getFileFromIndexedDb(ann.id);
    if (fromIdb?.dataUrl) {
      ann.fileDataUrl = fromIdb.dataUrl;
      triggerBrowserDownload(fromIdb.dataUrl, targetFilename);
      return;
    }
  } catch {}

  // 3. Try Cloud Firestore chunks
  try {
    const fromCloud = await fetchFilePayloadFromFirestore(ann.id);
    if (fromCloud) {
      ann.fileDataUrl = fromCloud;
      saveFileToIndexedDb(ann.id, fromCloud, ann.fileName || '', ann.fileFormat || 'pdf', ann.fileSize || '');
      triggerBrowserDownload(fromCloud, targetFilename);
      return;
    }
  } catch {}

  // 4. Server streaming download
  const serverDownloadUrl = `/api/announcements/${encodeURIComponent(ann.id)}/download`;
  triggerBrowserDownload(serverDownloadUrl, targetFilename);
}

// Announcements
export function getAnnouncements(): SchoolAnnouncement[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedAnnouncements = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.debug('Error reading local announcements:', err);
  }
  return cachedAnnouncements && cachedAnnouncements.length > 0 ? cachedAnnouncements : INITIAL_ANNOUNCEMENTS;
}

export function saveAnnouncement(ann: Omit<SchoolAnnouncement, 'id' | 'createdAt' | 'views'>): SchoolAnnouncement {
  const anns = getAnnouncements();
  const newAnn: SchoolAnnouncement = {
    ...ann,
    id: 'ann-' + Date.now(),
    createdAt: new Date().toISOString(),
    views: 1,
  };

  const updated = [newAnn, ...anns.filter(a => a.id !== newAnn.id)];
  cachedAnnouncements = updated;
  safeSetItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('announcements-change'));

  // Save attachment to persistent IndexedDB
  if (newAnn.fileDataUrl) {
    saveFileToIndexedDb(
      newAnn.id,
      newAnn.fileDataUrl,
      newAnn.fileName || '',
      newAnn.fileFormat || 'pdf',
      newAnn.fileSize || ''
    ).catch(() => {});
  }

  // Auto-generate notification for target recipients without disturbing the author
  const annNotif: AppNotification = {
    id: 'notif-ann-' + Date.now(),
    type: 'announcement',
    title: `إعلان رسمي جديد: ${newAnn.title}`,
    message: (newAnn.content || '').slice(0, 140) + ((newAnn.content || '').length > 140 ? '...' : ''),
    targetRole: newAnn.target || 'all',
    sourceAuthorName: newAnn.authorName || 'إدارة المؤسسة',
    sourceId: newAnn.id,
    createdAt: new Date().toISOString(),
    readBy: [],
  };
  sessionAlertedNotifIds.add(annNotif.id);
  addNotificationLocally(annNotif, false);

  // 1. Direct Cloud Database Save (Firebase Firestore)
  saveAnnouncementToFirestore(newAnn).catch(err => {
    console.warn('[Firestore] Cloud save announcement error:', err);
  });

  // 2. Local server sync
  fetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAnn),
  }).catch(() => {});

  return newAnn;
}

export function deleteAnnouncement(annId: string): void {
  const anns = getAnnouncements();
  const updated = anns.filter(a => a.id !== annId);
  cachedAnnouncements = updated;
  safeSetItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('announcements-change'));

  // 1. Direct Cloud Database Delete
  deleteAnnouncementFromFirestore(annId).catch(err => {
    console.warn('[Firestore] Cloud delete announcement error:', err);
  });

  // 2. Local server delete
  fetch('/api/announcements/' + encodeURIComponent(annId), {
    method: 'DELETE',
  }).catch(() => {});
}

// Summons (الاستدعاءات)
export function getSummons(): ParentSummon[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEYS.SUMMONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedSummons = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.debug('Error reading local summons:', err);
  }
  return cachedSummons && cachedSummons.length > 0 ? cachedSummons : INITIAL_SUMMONS;
}

export function saveSummon(summon: Omit<ParentSummon, 'id' | 'issuedAt' | 'status'>): ParentSummon {
  const summons = getSummons();
  const newSummon: ParentSummon = {
    ...summon,
    id: 'sum-' + Date.now(),
    issuedAt: new Date().toISOString(),
    status: 'sent',
  };

  const updated = [newSummon, ...summons.filter(s => s.id !== newSummon.id)];
  cachedSummons = updated;
  safeSetItem(STORAGE_KEYS.SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('summons-change'));

  // 1. Direct Cloud Database Save
  saveSummonToFirestore(newSummon).catch(err => {
    console.warn('[Firestore] Cloud save summon error:', err);
  });

  // 2. Local server sync
  fetch('/api/summons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSummon),
  }).catch(() => {});

  return newSummon;
}

export function deleteSummon(summonId: string): void {
  const summons = getSummons();
  const updated = summons.filter(s => s.id !== summonId);
  cachedSummons = updated;
  safeSetItem(STORAGE_KEYS.SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('summons-change'));

  // 1. Direct Cloud Database Delete
  deleteSummonFromFirestore(summonId).catch(err => {
    console.warn('[Firestore] Cloud delete summon error:', err);
  });

  // 2. Local server delete
  fetch('/api/summons/' + encodeURIComponent(summonId), {
    method: 'DELETE',
  }).catch(() => {});
}

export function updateSummonStatus(summonId: string, status: ParentSummon['status']): void {
  const summons = getSummons();
  const updated = summons.map(s => (s.id === summonId ? { ...s, status } : s));
  cachedSummons = updated;
  safeSetItem(STORAGE_KEYS.SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('summons-change'));

  const target = updated.find(s => s.id === summonId);
  if (target) {
    saveSummonToFirestore(target).catch(() => {});
  }

  fetch('/api/summons/' + encodeURIComponent(summonId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => {});
}

// ================= استدعاءات وتكليفات الطاقم الداخلي (العمال المهنيون والمشرفون) =================
export function getInternalStaffSummons(): InternalStaffSummon[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEYS.INTERNAL_STAFF_SUMMONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to get internal staff summons:', err);
  }
  return [];
}

export function saveInternalStaffSummon(
  summon: Omit<InternalStaffSummon, 'id' | 'issuedAt' | 'status'>
): InternalStaffSummon {
  const currentList = getInternalStaffSummons();
  const newSummon: InternalStaffSummon = {
    ...summon,
    id: 'int-sum-' + Date.now(),
    issuedAt: new Date().toISOString(),
    status: 'pending',
  };

  const updated = [newSummon, ...currentList.filter(s => s.id !== newSummon.id)];
  safeSetItem(STORAGE_KEYS.INTERNAL_STAFF_SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('internal-staff-summons-change'));

  // Notification for staff
  addNotificationLocally({
    id: 'notif-staff-sum-' + Date.now(),
    type: 'summon',
    title: `استدعاء / تكليف بمهمة: ${newSummon.targetStaffName}`,
    message: `${newSummon.issuerName} قامت بإصدار استدعاء/تكليف بمهمة: "${newSummon.reason}" بتاريخ ${newSummon.appointmentDate} (${newSummon.appointmentTime}).`,
    targetRole: 'staff',
    targetUserId: newSummon.targetStaffIdentifier,
    sourceAuthorName: newSummon.issuerName,
    createdAt: new Date().toISOString(),
    readBy: [],
  }, true);

  // Sync to server
  fetch('/api/internal-summons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSummon),
  }).catch(() => {});

  return newSummon;
}

export function updateInternalStaffSummonStatus(
  summonId: string,
  status: InternalStaffSummon['status']
): void {
  const currentList = getInternalStaffSummons();
  const updated = currentList.map(s => (s.id === summonId ? { ...s, status } : s));
  safeSetItem(STORAGE_KEYS.INTERNAL_STAFF_SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('internal-staff-summons-change'));

  fetch('/api/internal-summons/' + encodeURIComponent(summonId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => {});
}

export function deleteInternalStaffSummon(summonId: string): void {
  const currentList = getInternalStaffSummons();
  const updated = currentList.filter(s => s.id !== summonId);
  safeSetItem(STORAGE_KEYS.INTERNAL_STAFF_SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('internal-staff-summons-change'));

  fetch('/api/internal-summons/' + encodeURIComponent(summonId), {
    method: 'DELETE',
  }).catch(() => {});
}

// Format official WhatsApp message for summons
export function formatWhatsAppSummonMessage(summon: ParentSummon): string {
  const reasonTextMap: Record<string, string> = {
    absence: 'غيابات متكررة وتأخرات غير مبررة',
    discipline: 'متابعة السلوك والانضباط المدرسي',
    grades: 'مناقشة النتائج الدراسية والمستوى التحصيلي',
    admin: 'أمر إداري هام وعاجل يخص التلميذ(ة)',
    report_card: 'استلام كشف النقاط والملاحظات التوجيهية',
    other: 'أمر تربوي وإداري هام',
  };

  const reasonDesc = reasonTextMap[summon.reason] || summon.reasonDetails || 'أمر تربوي';

  const message = `السلام عليكم ورحمة الله وبركاته،
تحية طيبة وبعد،

يشرف إدارة *${SCHOOL_NAME}* (مكتب الناظر / مستشارية التربية) أن تدعو ولي أمر التلميذ(ة):
👤 *الاسم واللقب:* ${summon.studentName}
🏫 *القسم:* ${summon.studentClass}
📌 *سبب الاستدعاء:* ${reasonDesc}
${summon.reasonDetails ? `📝 *تفاصيل إضافية:* ${summon.reasonDetails}\n` : ''}
📅 *الموعد المحدد:* يوم ${summon.appointmentDate}
⏰ *التوقيت:* ${summon.appointmentTime}
📍 *المكان:* مكتب الناظر / مستشار التربية بالمؤسسة.

⚠️ *ملاحظة:* يرجى الحضور شخصياً في الموعد المحدد لأهمية الموضوع في المسار الدراسي لابنكم/ابنتكم.

مع فائق عبارات الاحترام والتقدير،
*إدارة ${SCHOOL_NAME}*`;

  return message;
}

// Open WhatsApp with pre-filled message
export function openWhatsAppSummon(summon: ParentSummon): void {
  const message = formatWhatsAppSummonMessage(summon);
  // Clean phone number (Algerian numbers format: 0550... -> 213550...)
  let phone = summon.guardianPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) {
    phone = '213' + phone.substring(1);
  } else if (!phone.startsWith('213')) {
    phone = '213' + phone;
  }

  const encoded = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encoded}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

// Password Reset by Email functionality
export function requestPasswordReset(identifierOrEmail: string): {
  success: boolean;
  message: string;
  emailMasked?: string;
  code?: string;
  targetUser?: UserProfile;
} {
  const users = getAllUsers();
  const query = identifierOrEmail.trim().toLowerCase();

  if (!query) {
    return {
      success: false,
      message: 'يرجى إدخال رقم التعريف المهني أو البريد الإلكتروني.',
    };
  }

  // Find user by identifier or email
  let user = users.find(
    u =>
      u.identifier.toLowerCase() === query ||
      (u.email && u.email.toLowerCase() === query)
  ) || (query.includes('1097448010036800') || query.includes('biomoleculaire7') ? users.find(u => u.identifier === '1097448010036800') : null);

  if (!user) {
    const staffMatch = OFFICIAL_STAFF_LIST.find(
      s =>
        s.identifier.toLowerCase() === query ||
        (s.email && s.email.toLowerCase() === query) ||
        `${s.surname} ${s.firstName}`.includes(query) ||
        query.includes(s.surname)
    );
    if (staffMatch) {
      user = toStaffUserProfile(staffMatch);
    }
  }

  if (!user) {
    return {
      success: false,
      message: 'لم يتم العثور على حساب مرتبط بهذا الرقم المهني أو البريد الإلكتروني في سجلات المؤسسة.',
    };
  }

  const userEmail = user.email || (user.role === 'director' ? 'biomoleculaire7@gmail.com' : `${user.identifier.toLowerCase()}@education.gov.dz`);
  
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in localStorage for 15 minutes
  const resetSession = {
    identifier: user.identifier,
    email: userEmail,
    code: code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  localStorage.setItem('ben_naama_pwd_reset', JSON.stringify(resetSession));

  // Mask email for privacy (e.g. b***7@gmail.com)
  const parts = userEmail.split('@');
  const namePart = parts[0];
  const maskedName = namePart.length > 2
    ? namePart[0] + '***' + namePart[namePart.length - 1]
    : namePart + '***';
  const emailMasked = `${maskedName}@${parts[1] || 'gmail.com'}`;

  return {
    success: true,
    message: `تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني: ${emailMasked}`,
    emailMasked,
    code,
    targetUser: user,
  };
}

export function resetPasswordWithCode(
  identifierOrEmail: string,
  enteredCode: string,
  newPassword: string
): { success: boolean; message: string; user?: UserProfile } {
  if (!newPassword || newPassword.trim().length < 3) {
    return {
      success: false,
      message: 'يرجى كتابة كلمة سر جديدة تتكون من 3 أحرف أو أرقام على الأقل.',
    };
  }

  const rawSession = localStorage.getItem('ben_naama_pwd_reset');
  if (!rawSession) {
    return {
      success: false,
      message: 'انتهت صلاحية جلسة استرجاع كلمة السر أو لم يتم طلب رمز بعد. يرجى طلب رمز التحقق مجدداً.',
    };
  }

  try {
    const session = JSON.parse(rawSession);
    if (session.code !== enteredCode.trim()) {
      return {
        success: false,
        message: 'رمز التحقق غير صحيح. يرجى التأكد من الرمز المرسل إلى بريدك الإلكتروني.',
      };
    }

    if (Date.now() > session.expiresAt) {
      return {
        success: false,
        message: 'انتهت صلاحية الرمز (أكثر من 15 دقيقة). يرجى طلب رمز جديد.',
      };
    }

    // Update user's pin in storage
    const users = getAllUsers();
    let updatedUser: UserProfile | null = null;

    const newUsers = users.map(u => {
      if (
        u.identifier.toLowerCase() === session.identifier.toLowerCase() ||
        (u.email && u.email.toLowerCase() === session.email.toLowerCase())
      ) {
        updatedUser = {
          ...u,
          pin: newPassword.trim(),
        };
        return updatedUser;
      }
      return u;
    });

    if (!updatedUser) {
      // If director not in list yet
      if (session.identifier === '1097448010036800') {
        updatedUser = {
          id: 'director-1',
          identifier: '1097448010036800',
          pin: newPassword.trim(),
          email: 'biomoleculaire7@gmail.com',
          name: 'مدير متوسطة الشهيد بن نعمة مصطفى',
          role: 'director',
          title: 'مدير المؤسسة',
          phone: '0550001122',
        };
        newUsers.push(updatedUser);
      }
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
    localStorage.removeItem('ben_naama_pwd_reset');

    if (updatedUser) {
      setCurrentUser(updatedUser);
    }

    return {
      success: true,
      message: 'تم تحديث كلمة السر بنجاح!',
      user: updatedUser || undefined,
    };
  } catch {
    return {
      success: false,
      message: 'حدث خطأ أثناء معالجة استرجاع كلمة السر.',
    };
  }
}

// Direct password reset/update by providing Identifier + (optional email) + new password (>= 4 chars)
export function directResetPassword(
  identifier: string,
  email: string,
  newPass: string
): { success: boolean; message: string; user?: UserProfile } {
  const cleanId = identifier.trim().toLowerCase();
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanPass = newPass ? newPass.trim() : '';

  if (!cleanId) {
    return {
      success: false,
      message: 'يرجى إدخال رقم التعريف المهني المكون من 16 رقماً.',
    };
  }

  if (cleanPass.length < 4) {
    return {
      success: false,
      message: 'كلمة السر الجديدة يجب أن تتكون من 4 خانات على الأقل.',
    };
  }

  const users = getAllUsers();
  let user = users.find(
    u =>
      u.identifier.toLowerCase() === cleanId ||
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
  );

  if (!user) {
    const staffMatch = OFFICIAL_STAFF_LIST.find(
      s =>
        s.identifier.toLowerCase() === cleanId ||
        (cleanEmail && s.email && s.email.toLowerCase() === cleanEmail)
    );
    if (staffMatch) {
      user = toStaffUserProfile(staffMatch);
    }
  }

  if (!user) {
    return {
      success: false,
      message: '⛔ لم يتم العثور على موظف بهذا الرقم المهني في السجلات الرسمية لمتوسطة الشهيد بن نعمة مصطفى.',
    };
  }

  const targetUser: UserProfile = {
    ...user,
    pin: cleanPass,
    email: cleanEmail || user.email || (cleanId === '1097448010036800' ? 'biomoleculaire7@gmail.com' : `${cleanId}@education.dz`),
  };

  const newUsers = users.map(u => (u.identifier === targetUser.identifier ? targetUser : u));
  if (!users.some(u => u.identifier === targetUser.identifier)) {
    newUsers.push(targetUser);
  }

  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
  setCurrentUser(targetUser);
  window.dispatchEvent(new Event('auth-change'));

  fetch('/api/users/update-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: targetUser.identifier, pin: cleanPass }),
  }).catch(() => {});

  return {
    success: true,
    message: 'تم تحديث كلمة السر بنجاح (4 خانات فما فوق)! تم تسجيل دخولك بأمان.',
    user: targetUser,
  };
}

// Update password for currently logged-in user
export function updateCurrentUserPassword(newPass: string): { success: boolean; message: string } {
  const current = getCurrentUser();
  if (!current) {
    return { success: false, message: 'لا يوجد مستخدم مسجل حالياً.' };
  }

  const cleanPass = newPass.trim();
  if (cleanPass.length < 4) {
    return { success: false, message: 'كلمة السر الجديدة يجب أن تتكون من 4 خانات على الأقل.' };
  }

  return directResetPassword(current.identifier, current.email || '', cleanPass);
}

// ================= إدارة حسابات وكلمات سر الطاقم المهني =================

export interface StaffAccountItem {
  identifier: string;
  surname: string;
  firstName: string;
  fullName: string;
  rank: string;
  subjectName?: string;
  role: UserRole;
  pin?: string;
  hasCustomPin: boolean;
  email?: string;
  birthDate?: string;
}

export function getOfficialStaffAccountList(): StaffAccountItem[] {
  const users = getAllUsers();
  return OFFICIAL_STAFF_LIST.map(member => {
    const userMatch = users.find(u => u.identifier.toLowerCase() === member.identifier.toLowerCase());
    const pin = getEffectiveStaffPin(member.identifier, (userMatch && userMatch.pin) ? userMatch.pin : member.pin);
    return {
      identifier: member.identifier,
      surname: member.surname,
      firstName: member.firstName,
      fullName: `${member.surname} ${member.firstName}`,
      rank: member.rank,
      subjectName: member.subjectName,
      role: member.role,
      pin: pin || undefined,
      hasCustomPin: Boolean(pin && pin.trim().length >= 4),
      email: userMatch?.email || member.email,
      birthDate: member.birthDate,
    };
  });
}

export function setStaffMemberPassword(identifier: string, newPin: string): { success: boolean; message: string; pin?: string } {
  const cleanId = normalizeIdentifier(identifier);
  const cleanPin = newPin.trim();
  if (cleanPin.length < 4) {
    return { success: false, message: 'كلمة السر يجب أن تتكون من 4 خانات على الأقل.' };
  }

  const users = getAllUsers();
  const existingIdx = users.findIndex(u => normalizeIdentifier(u.identifier) === cleanId);
  const officialMatch = OFFICIAL_STAFF_LIST.find(s => normalizeIdentifier(s.identifier) === cleanId);

  let targetUser: UserProfile;
  if (existingIdx >= 0) {
    targetUser = { ...users[existingIdx], pin: cleanPin };
  } else if (officialMatch) {
    targetUser = { ...toStaffUserProfile(officialMatch), pin: cleanPin };
  } else {
    return { success: false, message: 'لم يتم العثور على الموظف في السجلات.' };
  }

  const nowIso = new Date().toISOString();
  upsertStoredStaffPin(targetUser.identifier, cleanPin, nowIso, 'local');

  const updatedUsers = existingIdx >= 0
    ? users.map((u, i) => (i === existingIdx ? targetUser : u))
    : [targetUser, ...users];

  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

  // Automatically resolve any pending password reset requests for this employee so they are never blocked from logging in
  const currentRequests = getPasswordResetRequests();
  let requestsUpdated = false;
  const resolvedRequests = currentRequests.map(r => {
    if (normalizeIdentifier(r.identifier) === cleanId && r.status === 'pending') {
      requestsUpdated = true;
      return { ...r, status: 'approved' as const, resolvedAt: nowIso };
    }
    return r;
  });
  if (requestsUpdated) {
    safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(resolvedRequests));
    window.dispatchEvent(new CustomEvent('password-requests-updated'));
  }

  window.dispatchEvent(new Event('auth-change'));

  // Sync to Firestore & backend immediately
  saveStaffPinToFirestore(targetUser.identifier, cleanPin, nowIso).catch(() => {});
  resolvePendingResetRequestsForIdentifierInFirestore(targetUser.identifier, 'approved').catch(() => {});
  fetch('/api/users/update-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: targetUser.identifier, pin: cleanPin, updatedAt: nowIso }),
  }).catch(() => {});

  return {
    success: true,
    message: `تم تعيين وتحديث كلمة السر بنجاح للأستاذ/الموظف (${targetUser.name})!`,
    pin: cleanPin,
  };
}

// ================= نظام طلبات استرجاع وتفعيل كلمات السر المعلقة (حماية تامة من الاختراق) =================

export interface PasswordResetRequest {
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

export function getPasswordResetRequests(): PasswordResetRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function fetchPasswordResetRequestsFromServer(): Promise<PasswordResetRequest[]> {
  let merged = getPasswordResetRequests();

  // 1. Fetch from Express backend and merge safely (resolved beats pending)
  try {
    const res = await fetch('/api/password-reset-requests');
    if (res.ok) {
      const serverList = await res.json();
      if (Array.isArray(serverList)) {
        merged = mergePasswordResetRequests(merged, serverList as PasswordResetRequest[]);
      }
    }
  } catch {}

  // 2. Fetch from Firestore (cloud database) and merge safely
  try {
    const firestoreList = await fetchPasswordResetRequestsFromFirestore();
    if (Array.isArray(firestoreList)) {
      merged = mergePasswordResetRequests(merged, firestoreList as PasswordResetRequest[]);
    }
  } catch {}

  // 3. Also sync staff pins from Firestore so Director & Staff always see latest activated pins
  try {
    const cloudPins = await fetchAllStaffPinsFromFirestore();
    for (const [id, rec] of Object.entries(cloudPins)) {
      if (rec && rec.pin) {
        upsertStoredStaffPin(id, rec.pin, rec.updatedAt, 'firestore');
      }
    }
    merged = mergePasswordResetRequests(merged, []);
  } catch {}

  safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('password-requests-updated'));
  return merged;
}

export async function submitPasswordResetRequest(
  identifier: string,
  requestedPin: string,
  note?: string
): Promise<{ success: boolean; message: string; request?: PasswordResetRequest }> {
  const cleanId = normalizeIdentifier(identifier);
  const cleanPin = requestedPin.trim();

  if (!cleanId) {
    return { success: false, message: 'يرجى إدخال رقم التعريف المهني المكون من 16 رقماً.' };
  }
  if (cleanPin.length < 4) {
    return { success: false, message: 'كلمة السر الجديدة يجب أن تتكون من 4 خانات على الأقل.' };
  }

  // Verify staff exists in official roster or existing users
  const officialStaff = OFFICIAL_STAFF_LIST.find(
    s => normalizeIdentifier(s.identifier) === cleanId
  );
  const users = getAllUsers();
  const existingUser = users.find(u => normalizeIdentifier(u.identifier) === cleanId);

  if (!officialStaff && !existingUser) {
    return {
      success: false,
      message: '⛔ لم يتم العثور على موظف بهذا الرقم المهني في السجلات الرسمية لمؤسسة الشهيد بن نعمة مصطفى.',
    };
  }

  const canonicalId = officialStaff?.identifier || existingUser?.identifier || cleanId;
  const staffName = officialStaff
    ? `${officialStaff.surname} ${officialStaff.firstName}`
    : existingUser?.name || 'أستاذ / موظف';
  const staffRank = officialStaff?.rank || existingUser?.title || 'طاقم تربوي';

  const newRequest: PasswordResetRequest = {
    id: `reset-req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    identifier: canonicalId,
    staffName,
    staffRank,
    requestedPin: cleanPin,
    requestDate: new Date().toISOString(),
    note: note ? note.trim() : 'طلب استرجاع وتعيين كلمة سر جديدة',
    status: 'pending',
  };

  // 1. Save to local storage immediately (supersede older pending requests for this user)
  const currentRequests = getPasswordResetRequests().filter(
    r => !(normalizeIdentifier(r.identifier) === cleanId && r.status === 'pending')
  );
  currentRequests.unshift(newRequest);
  safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(currentRequests));
  window.dispatchEvent(new CustomEvent('password-requests-updated'));

  // 2. Add an in-app notification targeted to the Director
  try {
    const notif: AppNotification = {
      id: `notif-reset-${newRequest.id}`,
      type: 'announcement',
      title: 'طلب تفعيل كلمة سر جديدة 🔑',
      message: `قام الموظف ${newRequest.staffName} (${newRequest.staffRank}) بطلب تعيين كلمة سر جديدة. يرجى الدخول لحسابك لتفعيلها.`,
      targetRole: 'director',
      sourceAuthorName: newRequest.staffName,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    const curNotifs = getNotifications();
    curNotifs.unshift(notif);
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(curNotifs));
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch {}

  // 3. Save directly to Cloud Firestore and Express backend (await both so request reaches Director reliably)
  await Promise.allSettled([
    savePasswordResetRequestToFirestore(newRequest),
    fetch('/api/password-reset-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest),
    }),
  ]);

  return {
    success: true,
    message: 'تم تسجيل طلبك بنجاح! الحساب في حالة انتظار ومصادقة من طرف السيد المدير شخصياً.',
    request: newRequest,
  };
}

export async function approvePasswordResetRequest(
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const currentRequests = getPasswordResetRequests();
  const target = currentRequests.find(r => r.id === requestId);
  if (!target) {
    return { success: false, message: 'لم يتم العثور على هذا الطلب.' };
  }

  const nowIso = new Date().toISOString();
  const cleanId = normalizeIdentifier(target.identifier);
  const updatedTarget: PasswordResetRequest = {
    ...target,
    status: 'approved',
    resolvedAt: nowIso,
  };

  // Mark target AND any other pending requests for the same identifier as approved
  const updatedRequests = currentRequests.map(r => {
    if (r.id === requestId || (normalizeIdentifier(r.identifier) === cleanId && r.status === 'pending')) {
      return { ...r, status: 'approved' as const, resolvedAt: nowIso };
    }
    return r;
  });
  safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(updatedRequests));

  // Directly set the new password locally and persist across Firestore and Express server
  setStaffMemberPassword(target.identifier, target.requestedPin);

  await Promise.allSettled([
    approvePasswordResetRequestInFirestore(updatedTarget),
    saveStaffPinToFirestore(target.identifier, target.requestedPin, nowIso),
    fetch(`/api/password-reset-requests/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTarget),
    }),
    fetch('/api/users/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: target.identifier,
        pin: target.requestedPin.trim(),
        updatedAt: nowIso,
      }),
    }),
  ]);

  window.dispatchEvent(new CustomEvent('password-requests-updated'));
  return {
    success: true,
    message: `تمت الموافقة وتفعيل كلمة السر بنجاح للموظف (${target.staffName})! يمكنه الآن تسجيل الدخول مباشرة بكلمة السر الجديدة.`,
  };
}

export async function rejectPasswordResetRequest(
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const currentRequests = getPasswordResetRequests();
  const target = currentRequests.find(r => r.id === requestId);
  if (!target) {
    return { success: false, message: 'لم يتم العثور على هذا الطلب.' };
  }

  target.status = 'rejected';
  target.resolvedAt = new Date().toISOString();
  safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(currentRequests));

  rejectPasswordResetRequestInFirestore(requestId).catch(() => {});

  try {
    await fetch(`/api/password-reset-requests/${requestId}/reject`, { method: 'POST' });
  } catch {}

  window.dispatchEvent(new CustomEvent('password-requests-updated'));
  return {
    success: true,
    message: `تم رفض الطلب بنجاح والإبقاء على كلمة السر السابقة لحماية الحساب من أي اختراق أو تعديل غير مصرح.`,
  };
}

export async function deletePasswordResetRequest(
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const currentRequests = getPasswordResetRequests().filter(r => r.id !== requestId);
  safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(currentRequests));

  deletePasswordResetRequestFromFirestore(requestId).catch(() => {});

  try {
    await fetch(`/api/password-reset-requests/${requestId}`, { method: 'DELETE' });
  } catch {}

  window.dispatchEvent(new CustomEvent('password-requests-updated'));
  return { success: true, message: 'تم حذف الطلب من السجل بنجاح.' };
}

export function getPendingResetRequestsCount(): number {
  return getPasswordResetRequests().filter(r => r.status === 'pending').length;
}

// ================= قناة التضامن والتبادل بين تلاميذ القسم =================

export function getPeerExchanges(classId?: string): PeerExchangePost[] {
  if (cachedPeerExchanges && cachedPeerExchanges.length > 0) {
    if (classId) {
      return cachedPeerExchanges.filter(p => p.classId === classId);
    }
    return cachedPeerExchanges;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PEER_EXCHANGES);
    const list: PeerExchangePost[] = raw ? JSON.parse(raw) : INITIAL_PEER_EXCHANGES;
    cachedPeerExchanges = list;
    if (classId) {
      return list.filter(p => p.classId === classId);
    }
    return list;
  } catch {
    return INITIAL_PEER_EXCHANGES;
  }
}

export function savePeerExchange(
  post: Omit<PeerExchangePost, 'id' | 'createdAt' | 'thanksCount' | 'thankedBy' | 'replies'>
): PeerExchangePost {
  const current = getPeerExchanges();
  const newPost: PeerExchangePost = {
    ...post,
    id: 'peer-' + Date.now(),
    createdAt: new Date().toISOString(),
    thanksCount: 0,
    thankedBy: [],
    replies: [],
  };
  const updated = [newPost, ...current.filter(p => p.id !== newPost.id)];
  cachedPeerExchanges = updated;
  safeSetItem(STORAGE_KEYS.PEER_EXCHANGES, JSON.stringify(updated));
  window.dispatchEvent(new Event('peer-exchanges-change'));

  // 1. Direct Cloud Database Save
  savePeerPostToFirestore(newPost).catch(err => {
    console.warn('[Firestore] Cloud save peer post error:', err);
  });

  // 2. Local server sync
  fetch('/api/peer-exchanges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPost),
  }).catch(() => {});

  return newPost;
}

export function deletePeerExchange(postId: string): boolean {
  const current = getPeerExchanges();
  const target = current.find(p => p.id === postId);
  if (!target) return false;
  const updated = current.filter(p => p.id !== postId);
  cachedPeerExchanges = updated;
  safeSetItem(STORAGE_KEYS.PEER_EXCHANGES, JSON.stringify(updated));
  window.dispatchEvent(new Event('peer-exchanges-change'));

  // 1. Direct Cloud Database Delete
  deletePeerPostFromFirestore(postId).catch(err => {
    console.warn('[Firestore] Cloud delete peer post error:', err);
  });

  // 2. Local server delete
  fetch('/api/peer-exchanges/' + encodeURIComponent(postId), {
    method: 'DELETE',
  }).catch(() => {});

  return true;
}

export function thankPeerExchange(postId: string, studentId: string): PeerExchangePost | null {
  const current = getPeerExchanges();
  const idx = current.findIndex(p => p.id === postId);
  if (idx < 0) return null;
  const post = current[idx];
  const hasThanked = post.thankedBy.includes(studentId);
  const updatedPost: PeerExchangePost = {
    ...post,
    thanksCount: hasThanked ? Math.max(0, post.thanksCount - 1) : post.thanksCount + 1,
    thankedBy: hasThanked
      ? post.thankedBy.filter(id => id !== studentId)
      : [...post.thankedBy, studentId],
  };
  current[idx] = updatedPost;
  cachedPeerExchanges = current;
  safeSetItem(STORAGE_KEYS.PEER_EXCHANGES, JSON.stringify(current));
  window.dispatchEvent(new Event('peer-exchanges-change'));

  // 1. Direct Cloud Database Update
  savePeerPostToFirestore(updatedPost).catch(() => {});

  // 2. Local server sync
  fetch(`/api/peer-exchanges/${encodeURIComponent(postId)}/thank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  }).catch(() => {});

  return updatedPost;
}

export function addPeerExchangeReply(
  postId: string,
  reply: Omit<PeerExchangeReply, 'id' | 'createdAt'>
): PeerExchangePost | null {
  const current = getPeerExchanges();
  const idx = current.findIndex(p => p.id === postId);
  if (idx < 0) return null;
  const post = current[idx];
  const newReply: PeerExchangeReply = {
    ...reply,
    id: 'rep-' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  const updatedPost: PeerExchangePost = {
    ...post,
    replies: [...(post.replies || []), newReply],
  };
  current[idx] = updatedPost;
  cachedPeerExchanges = current;
  safeSetItem(STORAGE_KEYS.PEER_EXCHANGES, JSON.stringify(current));
  window.dispatchEvent(new Event('peer-exchanges-change'));

  // 1. Direct Cloud Database Update
  savePeerPostToFirestore(updatedPost).catch(() => {});

  // 2. Local server sync
  fetch('/api/peer-exchanges/' + encodeURIComponent(postId) + '/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reply),
  }).catch(() => {});

  return updatedPost;
}

// ================= المزامنة الشاملة عبر الخادم المركزي (Cross-Device Real-Time Sync) =================

export type SyncStatus = 'connected' | 'syncing' | 'offline';

let currentSyncStatus: SyncStatus =
  typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected';
let lastSuccessfulSyncTime: number | null = null;

export function getSyncStatus(): { status: SyncStatus; lastSyncTime: number | null } {
  return {
    status: currentSyncStatus,
    lastSyncTime: lastSuccessfulSyncTime,
  };
}

export function updateSyncStatus(newStatus: SyncStatus): void {
  currentSyncStatus = newStatus;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sync-status-change', {
        detail: { status: newStatus, lastSyncTime: lastSuccessfulSyncTime },
      })
    );
  }
}

let isSyncing = false;
export async function syncWithServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateSyncStatus('offline');
    return;
  }
  if (isSyncing) return;
  isSyncing = true;
  updateSyncStatus('syncing');

  try {
    const syncRes = await fetch('/api/sync');

    if (syncRes.ok) {
      lastSuccessfulSyncTime = Date.now();
      updateSyncStatus('connected');
      const contentType = syncRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return;
      }

      const data = await syncRes.json();

      // 1. Documents: Intelligently merge server documents with any local docs
      if (Array.isArray(data.documents)) {
        const currentLocal = cachedDocuments && cachedDocuments.length > 0 ? cachedDocuments : getDocuments();
        const serverDocIds = new Set(data.documents.map((d: SchoolDocument) => d.id));
        
        // Find documents saved locally that the server hasn't seen yet
        const unsyncedLocals = currentLocal.filter(d => !serverDocIds.has(d.id));

        // Re-push unsynced local documents to ensure they reach the server and other devices
        for (const un of unsyncedLocals) {
          fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(un),
          }).catch(() => {});
        }

        // Unified documents list: unsynced locals at top, then server documents
        const mergedDocs: SchoolDocument[] = [
          ...unsyncedLocals,
          ...data.documents.map((sDoc: SchoolDocument) => {
            const localMatch = currentLocal.find(l => l.id === sDoc.id);
            if (localMatch?.fileDataUrl && !sDoc.fileDataUrl) {
              return { ...sDoc, fileDataUrl: localMatch.fileDataUrl };
            }
            return sDoc;
          }),
        ];

        const prevDocsStr = JSON.stringify(currentLocal.map(d => ({ id: d.id, dl: d.downloadCount })));
        const newDocsStr = JSON.stringify(mergedDocs.map(d => ({ id: d.id, dl: d.downloadCount })));

        if (prevDocsStr !== newDocsStr || !cachedDocuments || cachedDocuments.length !== mergedDocs.length) {
          cachedDocuments = mergedDocs;
          safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(mergedDocs));
          window.dispatchEvent(new Event('documents-change'));
        }
      }

      // 2. Announcements
      if (Array.isArray(data.announcements)) {
        const currentAnns = getAnnouncements();
        const serverAnnIds = new Set(data.announcements.map((a: SchoolAnnouncement) => a.id));
        const unsyncedAnns = currentAnns.filter(a => !serverAnnIds.has(a.id));
        for (const un of unsyncedAnns) {
          fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(un),
          }).catch(() => {});
        }
        const mergedAnns = [...unsyncedAnns, ...data.announcements];
        const prevAnnsStr = JSON.stringify(currentAnns.map(a => a.id));
        const newAnnsStr = JSON.stringify(mergedAnns.map(a => a.id));
        if (prevAnnsStr !== newAnnsStr || !cachedAnnouncements) {
          cachedAnnouncements = mergedAnns;
          safeSetItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(mergedAnns));
          window.dispatchEvent(new Event('announcements-change'));
        }
      }

      // 3. Summons
      if (Array.isArray(data.summons)) {
        const currentSummons = getSummons();
        const serverSummonIds = new Set(data.summons.map((s: ParentSummon) => s.id));
        const unsyncedSummons = currentSummons.filter(s => !serverSummonIds.has(s.id));
        for (const un of unsyncedSummons) {
          fetch('/api/summons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(un),
          }).catch(() => {});
        }
        const mergedSummons = [...unsyncedSummons, ...data.summons];
        const prevSummonsStr = JSON.stringify(currentSummons.map(s => s.id));
        const newSummonsStr = JSON.stringify(mergedSummons.map(s => s.id));
        if (prevSummonsStr !== newSummonsStr || !cachedSummons) {
          cachedSummons = mergedSummons;
          safeSetItem(STORAGE_KEYS.SUMMONS, JSON.stringify(mergedSummons));
          window.dispatchEvent(new Event('summons-change'));
        }
      }

      // 4. Peer Exchanges
      if (Array.isArray(data.peerExchanges)) {
        const currentPeer = getPeerExchanges();
        const serverPeerIds = new Set(data.peerExchanges.map((p: PeerExchangePost) => p.id));
        const unsyncedPeer = currentPeer.filter(p => !serverPeerIds.has(p.id));
        for (const un of unsyncedPeer) {
          fetch('/api/peer-exchanges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(un),
          }).catch(() => {});
        }
        const mergedPeer = [...unsyncedPeer, ...data.peerExchanges];
        const prevPeerStr = JSON.stringify(currentPeer.map(p => ({ id: p.id, thanks: p.thanksCount, reps: p.replies?.length })));
        const newPeerStr = JSON.stringify(mergedPeer.map(p => ({ id: p.id, thanks: p.thanksCount, reps: p.replies?.length })));
        if (prevPeerStr !== newPeerStr || !cachedPeerExchanges) {
          cachedPeerExchanges = mergedPeer;
          safeSetItem(STORAGE_KEYS.PEER_EXCHANGES, JSON.stringify(mergedPeer));
          window.dispatchEvent(new Event('peer-exchanges-change'));
        }
      }

      // 5. User custom pins (timestamp-aware merge so stale server pins never overwrite newer Firestore approvals)
      if (data.userCustomPins && typeof data.userCustomPins === 'object') {
        const timestamps: Record<string, string> = data.userCustomPinTimestamps && typeof data.userCustomPinTimestamps === 'object'
          ? data.userCustomPinTimestamps
          : {};
        let pinUpdated = false;
        for (const [id, customPin] of Object.entries(data.userCustomPins)) {
          if (typeof customPin === 'string' && customPin.trim().length >= 4) {
            if (upsertStoredStaffPin(id, customPin, timestamps[id.toLowerCase()], 'server')) {
              pinUpdated = true;
            }
          }
        }
        const users = getAllUsers();
        let changed = false;
        const updatedUsers = users.map(u => {
          if (u.role === 'student') return u;
          const effective = getEffectiveStaffPin(u.identifier, u.pin);
          if (effective && u.pin !== effective) {
            changed = true;
            return { ...u, pin: effective };
          }
          return u;
        });
        if (changed) {
          safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
        }
        if (changed || pinUpdated) {
          window.dispatchEvent(new Event('auth-change'));
        }
      }

      // 5b. Password Reset Requests Sync (Safe merge: resolved approvals/rejections always win over stale pending items)
      if (Array.isArray(data.passwordResetRequests)) {
        const currentReqs = getPasswordResetRequests();
        const mergedReqs = mergePasswordResetRequests(currentReqs, data.passwordResetRequests);
        const prevStr = JSON.stringify(currentReqs.map(r => ({ id: r.id, status: r.status, pin: r.requestedPin })));
        const nextStr = JSON.stringify(mergedReqs.map(r => ({ id: r.id, status: r.status, pin: r.requestedPin })));
        if (prevStr !== nextStr) {
          safeSetItem(STORAGE_KEYS.PASSWORD_RESET_REQUESTS, JSON.stringify(mergedReqs));
          window.dispatchEvent(new CustomEvent('password-requests-updated'));
        }
      }

      // 5c. Custom Newly Added Students Sync
      if (Array.isArray(data.customStudents)) {
        const localCustom = getCustomStudents();
        const serverIds = new Set(
          data.customStudents.map((s: UserProfile) => normalizeIdentifier(s.identifier))
        );
        const unsyncedCustom = localCustom.filter(
          s => !serverIds.has(normalizeIdentifier(s.identifier))
        );
        for (const un of unsyncedCustom) {
          fetch('/api/custom-students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(un),
          }).catch(() => {});
        }
        const map = new Map<string, UserProfile>();
        for (const s of data.customStudents) {
          if (s && s.identifier && s.activationCode) {
            map.set(normalizeIdentifier(s.identifier), s);
          }
        }
        for (const s of unsyncedCustom) {
          map.set(normalizeIdentifier(s.identifier), s);
        }
        const mergedCustom = Array.from(map.values());
        if (JSON.stringify(localCustom.map(s => s.identifier)) !== JSON.stringify(mergedCustom.map(s => s.identifier))) {
          safeSetItem(STORAGE_KEYS.CUSTOM_STUDENTS, JSON.stringify(mergedCustom));
          window.dispatchEvent(new Event('custom-students-change'));
          window.dispatchEvent(new Event('auth-change'));
        }
      }
    }

    // 6. User Notifications
    const user = getCurrentUser();
    const query = new URLSearchParams();
    if (user) {
      query.set('userId', user.identifier);
      query.set('role', user.role);
      if (user.classId) query.set('classId', user.classId);
    }
    const notifsRes = await fetch(`/api/notifications?${query.toString()}`);
    if (notifsRes.ok) {
      const serverNotifs: AppNotification[] = await notifsRes.json();
      const rawCurrent = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const currentNotifs: AppNotification[] = rawCurrent ? JSON.parse(rawCurrent) : [];
      const currentIds = new Set(currentNotifs.map(n => n.id));
      const brandNew = serverNotifs.filter(n => !currentIds.has(n.id));

      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(serverNotifs));
      window.dispatchEvent(new Event('notifications-change'));

      maybeAlertSingleFreshNotification(brandNew);
      initialNotifsHydrated = true;
    }

    // 7. Student Peer Conversations & Messages Sync (للتلاميذ أو للرقابة الإدارية للمدير والناظر)
    if (user) {
      try {
        let syncUrl = '';
        if (user.role === 'student') {
          syncUrl = `/api/conversations-sync?studentId=${encodeURIComponent(user.identifier)}`;
        } else if (user.role === 'director' || user.role === 'censor') {
          syncUrl = `/api/conversations-sync?role=${encodeURIComponent(user.role)}`;
        }

        if (syncUrl) {
          const syncRes = await fetch(syncUrl);
          if (syncRes.ok) {
            const data = await syncRes.json();
            const serverConvs: PrivateConversation[] = data.conversations || [];
            const serverMsgs: PrivateMessage[] = data.messages || [];

            if (Array.isArray(serverConvs)) {
              const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS);
              const localConvs: PrivateConversation[] = raw ? JSON.parse(raw) : [];
              const localOtherUserConvs = user.role === 'student'
                ? localConvs.filter(c => !c.participantIds?.includes(user.identifier))
                : [];
              const mergedConvs = [...localOtherUserConvs, ...serverConvs];
              const prevStr = JSON.stringify(localConvs.map(c => ({ id: c.id, upd: c.updatedAt, last: c.lastMessage })));
              const newStr = JSON.stringify(mergedConvs.map(c => ({ id: c.id, upd: c.updatedAt, last: c.lastMessage })));
              if (prevStr !== newStr) {
                safeSetItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS, JSON.stringify(mergedConvs));
                window.dispatchEvent(new Event('private-conversations-change'));
              }
            }

            if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
              const rawMsgs = localStorage.getItem(STORAGE_KEYS.PRIVATE_MESSAGES);
              const localMsgs: PrivateMessage[] = rawMsgs ? JSON.parse(rawMsgs) : [];
              const serverMsgIds = new Set(serverMsgs.map(m => m.id));
              const localUnique = localMsgs.filter(m => !serverMsgIds.has(m.id));
              const mergedMsgs = [...serverMsgs, ...localUnique];
              if (mergedMsgs.length !== localMsgs.length) {
                safeSetItem(STORAGE_KEYS.PRIVATE_MESSAGES, JSON.stringify(mergedMsgs));
                window.dispatchEvent(new Event('private-messages-change'));
              }
            }
          }
        }
      } catch {}
    }
  } catch (err) {
    console.debug('[Sync] Sync network or transient offline:', err);
    updateSyncStatus('offline');
  } finally {
    isSyncing = false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateSyncStatus('offline');
    } else if (lastSuccessfulSyncTime && Date.now() - lastSuccessfulSyncTime < 10000) {
      updateSyncStatus('connected');
    }
  }
}

// ================= دوال إدارة التنبيهات والإعلانات المقروءة (Notifications & Seen Announcements) =================

export function isNotificationRelevantToUser(
  notif: AppNotification,
  user: UserProfile | null
): boolean {
  if (!user) return false;

  if (notif.targetUserId) {
    return normalizeIdentifier(notif.targetUserId) === normalizeIdentifier(user.identifier);
  }

  if (notif.targetClassId) {
    if (user.role === 'student') {
      return user.classId === notif.targetClassId;
    }
    return true;
  }

  if (!notif.targetRole || notif.targetRole === 'all') return true;
  if (user.role === 'student') return notif.targetRole === 'students';
  if (user.role === 'teacher') return notif.targetRole === 'teachers';
  return (
    notif.targetRole === user.role ||
    notif.targetRole === 'staff' ||
    notif.targetRole === 'teachers'
  );
}

export function getRelevantNotifications(user: UserProfile | null): AppNotification[] {
  if (!user) return [];
  return getNotifications().filter(n => isNotificationRelevantToUser(n, user));
}

function maybeAlertSingleFreshNotification(candidates: AppNotification[]): void {
  const user = getCurrentUser();
  if (!user || !initialNotifsHydrated) return;
  // Ignore startup grace period so opening the app never triggers noisy sound/popups
  if (Date.now() - APP_BOOT_MS < 4000) return;

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const freshRelevant = candidates
    .filter(n => {
      if (sessionAlertedNotifIds.has(n.id)) return false;
      if (n.readBy && n.readBy.includes(user.identifier)) return false;
      if (!isNotificationRelevantToUser(n, user)) return false;
      const createdMs = new Date(n.createdAt).getTime();
      return !Number.isNaN(createdMs) && createdMs >= tenMinutesAgo;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (freshRelevant.length > 0) {
    const latest = freshRelevant[0];
    freshRelevant.forEach(n => sessionAlertedNotifIds.add(n.id));
    triggerNotificationAlert(latest);
  }
}

export function getSeenAnnouncementIds(userId?: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`ben_naama_seen_anns_${normalizeIdentifier(userId)}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markAnnouncementAsSeen(announcementId: string, userId?: string): void {
  if (!userId || !announcementId) return;
  const key = `ben_naama_seen_anns_${normalizeIdentifier(userId)}`;
  const existing = getSeenAnnouncementIds(userId);
  if (!existing.includes(announcementId)) {
    const updated = [announcementId, ...existing].slice(0, 200);
    safeSetItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event('seen-announcements-change'));
  }
}

export function markAllAnnouncementsAsSeen(announcementIds: string[], userId?: string): void {
  if (!userId || announcementIds.length === 0) return;
  const key = `ben_naama_seen_anns_${normalizeIdentifier(userId)}`;
  const existing = getSeenAnnouncementIds(userId);
  const merged = Array.from(new Set([...announcementIds, ...existing])).slice(0, 200);
  safeSetItem(key, JSON.stringify(merged));
  window.dispatchEvent(new Event('seen-announcements-change'));
}

export function addNotificationLocally(notif: AppNotification, shouldAlert: boolean = true): void {
  const notifs = getNotifications();
  if (notifs.some(n => n.id === notif.id)) return;
  const updated = [notif, ...notifs];
  safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-change'));
  if (shouldAlert) {
    const user = getCurrentUser();
    if (user && isNotificationRelevantToUser(notif, user) && !sessionAlertedNotifIds.has(notif.id)) {
      sessionAlertedNotifIds.add(notif.id);
      triggerNotificationAlert(notif);
    }
  }
}

export function getNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUnreadNotificationsCount(userId?: string, user?: UserProfile | null): number {
  const activeUser = user ?? getCurrentUser();
  if (!userId || !activeUser) {
    return 0;
  }
  const relevant = getRelevantNotifications(activeUser);
  return relevant.filter(n => !n.readBy || !n.readBy.includes(userId)).length;
}

export async function markNotificationAsRead(notifId: string, userId: string): Promise<void> {
  const notifs = getNotifications();
  const updated = notifs.map(n =>
    n.id === notifId && (!n.readBy || !n.readBy.includes(userId))
      ? { ...n, readBy: [...(n.readBy || []), userId] }
      : n
  );
  safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-change'));

  fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, notificationIds: [notifId] }),
  }).catch(() => {});
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notifs = getNotifications();
  const updated = notifs.map(n =>
    !n.readBy || !n.readBy.includes(userId)
      ? { ...n, readBy: [...(n.readBy || []), userId] }
      : n
  );
  safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-change'));

  fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});
}

// ================= المحادثات الخاصة والسرية بين تلاميذ القسم =================

// جلب قائمة زملاء نفس القسم الدراسي حصرياً للتواصل الخاص
export function getClassmatesForStudent(classId: string, currentStudentId: string): UserProfile[] {
  if (!classId) return [];
  const allUsers = getAllUsers();
  const userMap = new Map<string, UserProfile>();

  // 1. All registered / edited students in state (strip private activation codes)
  for (const u of allUsers) {
    if (u.role === 'student' && u.classId === classId && u.identifier !== currentStudentId) {
      const { activationCode: _omitCode, ...safeProfile } = u;
      userMap.set(u.identifier, safeProfile);
    }
  }

  // 2. Official students from ministry list for this class (strip private activation codes)
  for (const s of OFFICIAL_STUDENTS_LIST) {
    if (s.classId === classId && s.identifier !== currentStudentId && !userMap.has(s.identifier)) {
      const { activationCode: _omitCode, ...safeProfile } = toUserProfile(s);
      userMap.set(s.identifier, safeProfile);
    }
  }

  return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

// جلب المحادثات الخاصة بالمستخدم الحالي فقط (خصوصية تامة ومضمونة)
export function getPrivateConversations(studentId: string): PrivateConversation[] {
  if (!studentId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS);
    const list: PrivateConversation[] = raw ? JSON.parse(raw) : [];
    return list
      .filter(c => Array.isArray(c.participantIds) && c.participantIds.includes(studentId))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch {
    return [];
  }
}

// إنشاء أو فتح محادثة سرية (فردية مع زميل محدد أو جماعية مع عدة زملاء)
export function createOrGetPrivateConversation(
  creator: UserProfile,
  selectedClassmates: UserProfile[],
  customTitle?: string
): PrivateConversation {
  const currentConvs = getPrivateConversations(creator.identifier);
  const participantIds = Array.from(new Set([creator.identifier, ...selectedClassmates.map(c => c.identifier)]));
  
  // إذا كانت محادثة ثنائية (1 لـ 1)، نتحقق أولاً إن كانت محادثة سابقة موجودة بينهما لمنع التكرار
  if (selectedClassmates.length === 1) {
    const otherId = selectedClassmates[0].identifier;
    const existing = currentConvs.find(
      c => !c.isGroup && c.participantIds.length === 2 && c.participantIds.includes(otherId)
    );
    if (existing) {
      return existing;
    }
  }

  const participantNames: Record<string, string> = {
    [creator.identifier]: creator.name,
  };
  selectedClassmates.forEach(c => {
    participantNames[c.identifier] = c.name;
  });

  const isGroup = selectedClassmates.length > 1;
  const autoTitle = isGroup
    ? (customTitle?.trim() || `مجموعة زملاء (${selectedClassmates.length + 1} مشاركين)`)
    : selectedClassmates[0].name;

  const newConv: PrivateConversation = {
    id: 'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    classId: creator.classId || '2AM-2',
    participantIds,
    participantNames,
    title: autoTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isGroup,
  };

  const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS);
  const allConvs: PrivateConversation[] = raw ? JSON.parse(raw) : [];
  const updatedAll = [newConv, ...allConvs.filter(c => c.id !== newConv.id)];
  safeSetItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS, JSON.stringify(updatedAll));
  window.dispatchEvent(new Event('private-conversations-change'));

  // Sync to Firestore Cloud
  savePrivateConversationToFirestore(newConv).catch(() => {});

  // Sync to Server
  fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newConv),
  }).catch(() => {});

  return newConv;
}

// حذف محادثة خاصة
export function deletePrivateConversation(convId: string): void {
  const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS);
  const allConvs: PrivateConversation[] = raw ? JSON.parse(raw) : [];
  const updated = allConvs.filter(c => c.id !== convId);
  safeSetItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS, JSON.stringify(updated));

  // حذف الرسائل التابعة لها
  const rawMsgs = localStorage.getItem(STORAGE_KEYS.PRIVATE_MESSAGES);
  const allMsgs: PrivateMessage[] = rawMsgs ? JSON.parse(rawMsgs) : [];
  const updatedMsgs = allMsgs.filter(m => m.conversationId !== convId);
  safeSetItem(STORAGE_KEYS.PRIVATE_MESSAGES, JSON.stringify(updatedMsgs));

  window.dispatchEvent(new Event('private-conversations-change'));
  window.dispatchEvent(new Event('private-messages-change'));

  // Cloud & server delete
  deletePrivateConversationFromFirestore(convId).catch(() => {});
  fetch('/api/conversations/' + encodeURIComponent(convId), { method: 'DELETE' }).catch(() => {});
}

// جلب رسائل محادثة معينة
export function getLocalPrivateMessages(conversationId: string): PrivateMessage[] {
  if (!conversationId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_MESSAGES);
    const list: PrivateMessage[] = raw ? JSON.parse(raw) : [];
    return list
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch {
    return [];
  }
}

// إرسال رسالة خاصة جديدة
export async function sendPrivateMessage(
  msg: Omit<PrivateMessage, 'id' | 'createdAt'>
): Promise<PrivateMessage> {
  const newMsg: PrivateMessage = {
    ...msg,
    id: 'pmsg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
  };

  // 1. Save message locally
  const rawMsgs = localStorage.getItem(STORAGE_KEYS.PRIVATE_MESSAGES);
  const allMsgs: PrivateMessage[] = rawMsgs ? JSON.parse(rawMsgs) : [];
  const updatedMsgs = [...allMsgs.filter(m => m.id !== newMsg.id), newMsg];
  safeSetItem(STORAGE_KEYS.PRIVATE_MESSAGES, JSON.stringify(updatedMsgs));

  // 2. Update conversation snippet & timestamp
  const rawConvs = localStorage.getItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS);
  const allConvs: PrivateConversation[] = rawConvs ? JSON.parse(rawConvs) : [];
  const convIndex = allConvs.findIndex(c => c.id === newMsg.conversationId);
  if (convIndex >= 0) {
    allConvs[convIndex] = {
      ...allConvs[convIndex],
      lastMessage: newMsg.content || (newMsg.fileName ? `📎 مرفق: ${newMsg.fileName}` : 'رسالة'),
      lastMessageAt: newMsg.createdAt,
      lastSenderName: newMsg.senderName,
      updatedAt: newMsg.createdAt,
    };
    safeSetItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS, JSON.stringify(allConvs));
  }

  window.dispatchEvent(new Event('private-messages-change'));
  window.dispatchEvent(new Event('private-conversations-change'));

  // 3. Save to Firestore Cloud Real-time
  savePrivateMessageToFirestore(newMsg).catch(() => {});

  // 4. Save to Server
  fetch(`/api/conversations/${encodeURIComponent(newMsg.conversationId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newMsg),
  }).catch(() => {});

  return newMsg;
}

// ================= الرقابة التربوية للمدير والناظر على محادثات التلاميذ =================

// جلب كافة محادثات التلاميذ عبر كافة الأقسام لأغراض المتابعة الإدارية والتربوية
export function getSupervisedConversations(classId?: string): PrivateConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_CONVERSATIONS);
    const list: PrivateConversation[] = raw ? JSON.parse(raw) : [];
    if (classId && classId !== 'ALL') {
      return list
        .filter(c => c.classId === classId)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    }
    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch {
    return [];
  }
}

// جلب رسائل محادثة معينة للمدير أو الناظر للتدقيق البيداغوجي والانضباطي
export async function getSupervisedMessages(conversationId: string, role: 'director' | 'censor'): Promise<PrivateMessage[]> {
  if (!conversationId) return [];
  const localMsgs = getLocalPrivateMessages(conversationId);
  try {
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages?role=${role}`);
    if (res.ok) {
      const serverMsgs: PrivateMessage[] = await res.json();
      if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
        return serverMsgs;
      }
    }
  } catch {}
  return localMsgs;
}

// حذف رسالة مخالفة من طرف المدير أو الناظر
export async function deleteSupervisedMessage(conversationId: string, messageId: string): Promise<void> {
  const rawMsgs = localStorage.getItem(STORAGE_KEYS.PRIVATE_MESSAGES);
  const allMsgs: PrivateMessage[] = rawMsgs ? JSON.parse(rawMsgs) : [];
  const updatedMsgs = allMsgs.filter(m => m.id !== messageId);
  safeSetItem(STORAGE_KEYS.PRIVATE_MESSAGES, JSON.stringify(updatedMsgs));
  window.dispatchEvent(new Event('private-messages-change'));

  fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

// ================= تتبع المتصلين الآن في المنصة (التلاميذ والأساتذة) =================

export const PRESENCE_ONLINE_WINDOW_MS = 65_000;

const presenceLocalCache = new Map<string, UserPresenceRecord>();

function normalizePresenceId(identifier?: string): string {
  return (identifier || '').trim().toLowerCase();
}

export function isPresenceOnline(record?: UserPresenceRecord | null, now = Date.now()): boolean {
  if (!record || !record.isOnline) return false;
  if (!record.lastSeen || typeof record.lastSeen !== 'number') return false;
  return now - record.lastSeen <= PRESENCE_ONLINE_WINDOW_MS;
}

export async function sendPresenceHeartbeat(user: UserProfile | null): Promise<void> {
  if (!user || !user.identifier) return;

  const record: UserPresenceRecord = {
    identifier: user.identifier,
    name: user.name,
    role: user.role,
    title: user.title,
    classId: user.classId,
    className: user.className,
    lastSeen: Date.now(),
    isOnline: true,
  };

  presenceLocalCache.set(normalizePresenceId(user.identifier), record);
  window.dispatchEvent(new Event('presence-updated'));

  savePresenceHeartbeatToFirestore(record).catch(() => {});

  fetch('/api/presence/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
    keepalive: true,
  }).catch(() => {});
}

export function markUserOffline(identifier?: string, useBeacon = false): void {
  const normId = normalizePresenceId(identifier);
  if (!normId || !identifier) return;

  const existing = presenceLocalCache.get(normId);
  if (existing) {
    presenceLocalCache.set(normId, {
      ...existing,
      isOnline: false,
      lastSeen: Date.now(),
    });
    window.dispatchEvent(new Event('presence-updated'));
  }

  markPresenceOfflineInFirestore(identifier).catch(() => {});

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const payload = new Blob([JSON.stringify({ identifier })], { type: 'application/json' });
      navigator.sendBeacon('/api/presence/offline', payload);
      return;
    } catch {
      // Fallback to fetch keepalive below
    }
  }

  fetch('/api/presence/offline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
    keepalive: true,
  }).catch(() => {});
}

export function subscribeToLivePresence(
  onUpdate: (records: UserPresenceRecord[]) => void
): () => void {
  let firestoreRecords: UserPresenceRecord[] = [];
  let serverRecords: UserPresenceRecord[] = [];

  const emitMerged = () => {
    const merged = new Map<string, UserPresenceRecord>();
    const absorb = (list: UserPresenceRecord[]) => {
      for (const rec of list) {
        const key = normalizePresenceId(rec.identifier);
        if (!key) continue;
        const prev = merged.get(key);
        if (!prev || rec.lastSeen >= prev.lastSeen) {
          merged.set(key, rec);
        }
      }
    };

    absorb(Array.from(presenceLocalCache.values()));
    absorb(serverRecords);
    absorb(firestoreRecords);

    onUpdate(Array.from(merged.values()));
  };

  const fetchServerPresence = async () => {
    try {
      const res = await fetch('/api/presence');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.records)) {
        serverRecords = data.records;
        emitMerged();
      }
    } catch {
      // Offline / fallback handled by Firestore
    }
  };

  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = initPresenceRealtimeSync(records => {
      firestoreRecords = records;
      emitMerged();
    });
  } catch {
    unsubFirestore = null;
  }

  const handleLocalPresence = () => emitMerged();
  window.addEventListener('presence-updated', handleLocalPresence);

  fetchServerPresence();
  const pollInterval = setInterval(fetchServerPresence, 12_000);

  return () => {
    if (unsubFirestore) unsubFirestore();
    window.removeEventListener('presence-updated', handleLocalPresence);
    clearInterval(pollInterval);
  };
}

