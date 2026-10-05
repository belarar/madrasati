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
  SchoolAnnouncement,
  SchoolDocument,
  SubjectId,
  UserProfile,
  UserRole,
} from '../types';
import { OFFICIAL_STUDENTS_LIST, toUserProfile } from '../data/officialStudents';
import { OFFICIAL_STAFF_LIST, toStaffUserProfile } from '../data/officialStaff';

export const STORAGE_KEYS = {
  CURRENT_USER: 'ben_naama_current_user',
  DOCUMENTS: 'ben_naama_documents',
  ANNOUNCEMENTS: 'ben_naama_announcements',
  SUMMONS: 'ben_naama_summons',
  USERS: 'ben_naama_users',
  PEER_EXCHANGES: 'ben_naama_peer_exchanges',
  NOTIFICATIONS: 'ben_naama_notifications',
};

const CLEAN_VERSION_KEY = 'ben_naama_strict_official_v16';

// In-memory cache for live cross-device sync and local quota protection
let cachedDocuments: SchoolDocument[] | null = null;
let cachedAnnouncements: SchoolAnnouncement[] | null = null;
let cachedSummons: ParentSummon[] | null = null;
let cachedPeerExchanges: PeerExchangePost[] | null = null;

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
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        window.dispatchEvent(new Event('auth-change'));
      }
    });
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
  }
}

// User Profile & Authentication
export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null; // Clean guest state - user must log in
    return JSON.parse(raw);
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

export function getAllUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return MOCK_USERS;
    const parsed: UserProfile[] = JSON.parse(raw);

    // Strictly retain ONLY official staff and official students of the school
    const officialStaffIds = new Set(OFFICIAL_STAFF_LIST.map(s => s.identifier));
    const officialStudentIds = new Set(OFFICIAL_STUDENTS_LIST.map(s => s.identifier));

    const validUsers = parsed.filter(u =>
      officialStaffIds.has(u.identifier) || officialStudentIds.has(u.identifier)
    );

    // Ensure all 435 official users are present
    const storedIds = new Set(validUsers.map(u => u.identifier));
    const missing = MOCK_USERS.filter(u => !storedIds.has(u.identifier));

    return [...validUsers, ...missing];
  } catch {
    return MOCK_USERS;
  }
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

// Strict student authentication against official roster
export function authenticateOfficialStudent(criteria: {
  identifier?: string;
  surname?: string;
  firstName?: string;
  fullName?: string;
  classId?: string;
}): { success: boolean; user?: UserProfile; message?: string } {
  const cleanId = criteria.identifier?.trim().replace(/\s+/g, '') || '';

  // 1. If 16-digit ID is entered, check exact match in official lists
  if (cleanId) {
    const idMatch = OFFICIAL_STUDENTS_LIST.find(s => s.identifier === cleanId);
    if (idMatch) {
      const user = toUserProfile(idMatch);
      registerNewUser(user);
      setCurrentUser(user);
      return { success: true, user };
    }
  }

  // 2. Search in official student roster by name
  const rawInput = [criteria.fullName, criteria.surname, criteria.firstName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const normInput = normalizeArabic(rawInput);

  if (!normInput) {
    return {
      success: false,
      message: 'يرجى إدخال رقم التعريف المدرسي أو الاسم واللقب للمتابعة.',
    };
  }

  const inputTokens = normInput.split(' ').filter(t => t.length > 0);

  // A. Exact combined normalized match
  let matchedStudent = OFFICIAL_STUDENTS_LIST.find(s => {
    const sNormFull = normalizeArabic(`${s.surname} ${s.firstName}`);
    return (
      sNormFull === normInput ||
      sNormFull.replace(/\s/g, '') === normInput.replace(/\s/g, '')
    );
  });

  // B. Token-based matching: all tokens typed exist in the student's full name
  if (!matchedStudent && inputTokens.length >= 2) {
    const candidates = OFFICIAL_STUDENTS_LIST.filter(s => {
      const sNormFull = normalizeArabic(`${s.surname} ${s.firstName}`);
      return inputTokens.every(tok => sNormFull.includes(tok));
    });
    if (candidates.length === 1) {
      matchedStudent = candidates[0];
    } else if (candidates.length > 1 && criteria.classId) {
      matchedStudent = candidates.find(c => c.classId === criteria.classId) || candidates[0];
    }
  }

  // C. Substring matching if input is specific enough
  if (!matchedStudent && normInput.length >= 5) {
    matchedStudent = OFFICIAL_STUDENTS_LIST.find(s => {
      const sNormFull = normalizeArabic(`${s.surname} ${s.firstName}`);
      return sNormFull.includes(normInput) || normInput.includes(sNormFull);
    });
  }

  if (!matchedStudent) {
    return {
      success: false,
      message: `⛔ عذراً، التلميذ (${rawInput}) غير مقيّد في القوائم الرسمية لمتوسطة الشهيد بن نعمة مصطفى. لا يُسمح بالدخول إلى المنصة إلا للتلاميذ المسجلين رسمياً في المؤسسة.`,
    };
  }

  const user = toUserProfile(matchedStudent);
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

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
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

  const staffUser: UserProfile = {
    id: existingIdx >= 0 ? users[existingIdx].id : `${actualRole}-${cleanId}`,
    identifier: cleanId,
    name: fullName.trim() || (actualRole === 'director' ? 'مدير المؤسسة' : 'أستاذ'),
    role: actualRole,
    pin: cleanPin || (existingIdx >= 0 ? users[existingIdx].pin : undefined),
    title: actualRole === 'director' ? 'مدير متوسطة الشهيد بن نعمة مصطفى' : roleTitle || 'أستاذ التعليم المتوسط',
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
  const cleanId = identifier.trim().toLowerCase();

  if (!cleanId) {
    return {
      success: false,
      message: 'يرجى إدخال رقم التعريف المهني أو المدرسي للمتابعة.',
    };
  }

  const users = getAllUsers();

  // 1. Check if identifier is in OFFICIAL_STAFF_LIST (All 42 official professors & administration)
  const officialStaff = OFFICIAL_STAFF_LIST.find(
    s => s.identifier.toLowerCase() === cleanId || s.identifier === identifier.trim()
  );
  const existingStaffUser = users.find(u => u.identifier.toLowerCase() === cleanId);

  if (officialStaff || (existingStaffUser && existingStaffUser.role !== 'student')) {
    const staffUser: UserProfile = existingStaffUser || toStaffUserProfile(officialStaff!);
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

    // If staff user already has a configured password in storage
    if (staffUser.pin) {
      if (enteredPin !== staffUser.pin) {
        return {
          success: false,
          message:
            '⛔ كلمة السر غير صحيحة. يرجى التأكد من كتابة كلمة السر بدقة (4 خانات فما فوق)، أو استخدام خيار "نسيت كلمة السر؟ تحديثها هنا" لتعيين كلمة جديدة فوراً.',
        };
      }
    } else {
      // First-time login for this official staff member:
      // Save this chosen password (4+ chars) as their personal official password!
      staffUser.pin = enteredPin;
      registerNewUser(staffUser);
    }

    registerNewUser(staffUser);
    setCurrentUser(staffUser);
    return { success: true, user: staffUser };
  }

  // 2. Check if identifier is an enrolled official student in OFFICIAL_STUDENTS_LIST
  const officialStudent = OFFICIAL_STUDENTS_LIST.find(
    s => s.identifier === cleanId || s.identifier === identifier.trim()
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

// Safe localStorage setter with QuotaExceeded fallback protection
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    let toStore = value;
    if (key === STORAGE_KEYS.DOCUMENTS) {
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

  // Sync to backend across all devices
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

  fetch('/api/documents/' + encodeURIComponent(docId), {
    method: 'DELETE',
  }).catch(() => {});
}

export function incrementDownloadCount(docId: string): void {
  const docs = getDocuments();
  const updated = docs.map(d => (d.id === docId ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d));
  cachedDocuments = updated;
  safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('documents-change'));
}

// Real downloadable file generator & streaming server downloader
export function downloadFile(doc: SchoolDocument): void {
  incrementDownloadCount(doc.id);

  // 1. If doc has explicit data URL in memory
  if (doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = doc.fileDataUrl;
    a.download = doc.fileName || `${doc.title}.${doc.fileFormat || 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Direct server-side streaming download
  const serverDownloadUrl = `/api/documents/${encodeURIComponent(doc.id)}/download`;
  const a = document.createElement('a');
  a.href = serverDownloadUrl;
  a.download = doc.fileName || `${doc.title}.${doc.fileFormat || 'pdf'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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

  fetch('/api/summons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSummon),
  }).catch(() => {});

  return newSummon;
}

export function updateSummonStatus(summonId: string, status: ParentSummon['status']): void {
  const summons = getSummons();
  const updated = summons.map(s => (s.id === summonId ? { ...s, status } : s));
  cachedSummons = updated;
  safeSetItem(STORAGE_KEYS.SUMMONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('summons-change'));

  fetch('/api/summons/' + encodeURIComponent(summonId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => {});

  fetch('/api/summons/' + encodeURIComponent(summonId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
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

  fetch('/api/peer-exchanges/' + encodeURIComponent(postId) + '/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reply),
  }).catch(() => {});

  return updatedPost;
}

// ================= المزامنة الشاملة عبر الخادم المركزي (Cross-Device Real-Time Sync) =================

let isSyncing = false;
export async function syncWithServer(): Promise<void> {
  if (isSyncing || typeof window === 'undefined') return;
  isSyncing = true;

  try {
    const syncRes = await fetch('/api/sync');

    if (syncRes.ok) {
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

      // 5. User custom pins
      if (data.userCustomPins && typeof data.userCustomPins === 'object') {
        const users = getAllUsers();
        let changed = false;
        const updatedUsers = users.map(u => {
          const customPin = data.userCustomPins[u.identifier.toLowerCase()];
          if (customPin && u.pin !== customPin) {
            changed = true;
            return { ...u, pin: customPin };
          }
          return u;
        });
        if (changed) {
          safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
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
      const serverNotifs = await notifsRes.json();
      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(serverNotifs));
      window.dispatchEvent(new Event('notifications-change'));
    }
  } catch (err) {
    console.debug('[Sync] Sync network or transient offline:', err);
  } finally {
    isSyncing = false;
  }
}

// ================= دوال إدارة التنبيهات (Notifications) =================

export function getNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUnreadNotificationsCount(userId?: string): number {
  if (!userId) {
    const notifs = getNotifications();
    return notifs.length;
  }
  const notifs = getNotifications();
  return notifs.filter(n => !n.readBy || !n.readBy.includes(userId)).length;
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


