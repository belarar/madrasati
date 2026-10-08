import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic port parsing
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
const PORT = cliPort || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

const app = express();

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Database Persistence File
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'school_database.json');

export interface AppNotification {
  id: string;
  type: 'document' | 'announcement' | 'summon' | 'peer_post' | 'peer_reply' | 'private_message';
  title: string;
  message: string;
  targetRole?: 'all' | 'students' | 'teachers' | 'staff' | 'director' | 'censor';
  targetClassId?: string; // e.g. '4AM-1'
  targetUserId?: string; // e.g. student identifier
  sourceAuthorName: string;
  sourceId?: string;
  createdAt: string;
  readBy: string[]; // user identifiers who opened it
}

export interface SchoolDatabase {
  documents: any[];
  announcements: any[];
  summons: any[];
  peerExchanges: any[];
  privateConversations: any[];
  privateMessages: any[];
  notifications: AppNotification[];
  userCustomPins: Record<string, string>; // identifier -> custom password
}

function loadDatabase(): SchoolDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.documents)) {
        if (!Array.isArray(parsed.privateConversations)) parsed.privateConversations = [];
        if (!Array.isArray(parsed.privateMessages)) parsed.privateMessages = [];
        // Sanitize and normalize documents
        parsed.documents = parsed.documents.map((d: any) => {
          const targetClasses = Array.isArray(d.targetClasses) && d.targetClasses.length > 0 ? d.targetClasses : ['ALL'];
          return {
            ...d,
            targetClasses,
            targetAudience: d.targetAudience || (targetClasses.includes('ALL') ? 'all_students' : 'specific_class'),
            subject: normalizeSubjectId(d.subject),
            docType: d.docType || 'lesson',
            fileFormat: d.fileFormat || 'pdf',
          };
        });
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading db file, falling back to defaults', err);
  }

  // Initial Seed
  const initialDb: SchoolDatabase = {
    documents: [
      {
        id: 'doc-official-guide-1',
        title: 'دليل استخدام المنصة الرقمية والتوجيهات المدرسية 2025/2026',
        description: 'دليل شامل يوضح لكافة الأساتذة والتلاميذ كيفية تبادل الوثائق التعليمية (فروض، دروس، ملخصات بصيغ Word و PDF) ومتابعة الإعلانات المدرسية الرسمية.',
        subject: 'admin',
        docType: 'circular',
        fileFormat: 'pdf',
        fileName: 'دليل_استخدام_المنصة_الرقمية.pdf',
        fileSize: '1.4 MB',
        authorId: 'director-1097448010036800',
        authorName: 'إدارة متوسطة الشهيد بن نعمة مصطفى',
        authorRole: 'director',
        targetClasses: ['ALL'],
        targetLevel: '4AM',
        uploadDate: new Date().toISOString(),
        downloadCount: 14,
      },
    ],
    announcements: [
      {
        id: 'ann-official-1',
        title: 'افتتاح المنصة الرقمية الرسمية لمتوسطة الشهيد بن نعمة مصطفى',
        content:
          'ترحب إدارة متوسطة الشهيد بن نعمة مصطفى بكافة الأساتذة الكرام وبناتنا وأبنائنا التلاميذ في المنصة الرقمية المخصصة لتبادل الوثائق التعليمية (Word و PDF) والفروض والدروس والتوجيهات المدرسية.\nنتمنى للجميع موسماً دراسياً مكللاً بالنجاح والتفوق.',
        target: 'all',
        priority: 'important',
        authorName: 'إدارة متوسطة الشهيد بن نعمة مصطفى',
        authorRole: 'director',
        createdAt: new Date().toISOString(),
        badge: 'إعلان افتتاحي رسمي',
        views: 12,
      },
    ],
    summons: [],
    peerExchanges: [],
    privateConversations: [],
    privateMessages: [],
    notifications: [
      {
        id: 'notif-welcome',
        type: 'announcement',
        title: 'مرحباً بكم في المنصة الرقمية',
        message: 'تم تدشين المنصة الرقمية لمتوسطة الشهيد بن نعمة مصطفى لتبادل الوثائق بين الأساتذة والتلاميذ.',
        targetRole: 'all',
        sourceAuthorName: 'إدارة المؤسسة',
        createdAt: new Date().toISOString(),
        readBy: [],
      },
    ],
    userCustomPins: {},
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(data: SchoolDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file', err);
  }
}

// In-Memory Database Cached from file
let db = loadDatabase();

// ================= API ROUTES (Cross-Device Sync) =================

// 1. Health check & Meta
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    documentsCount: db.documents.length,
    announcementsCount: db.announcements.length,
    peerExchangesCount: db.peerExchanges.length,
    notificationsCount: db.notifications.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Comprehensive Bi-Directional Multi-Device Sync
app.get('/api/sync', (req, res) => {
  res.json({
    documents: db.documents,
    announcements: db.announcements,
    summons: db.summons,
    peerExchanges: db.peerExchanges,
    privateConversations: db.privateConversations,
    privateMessages: db.privateMessages,
    notifications: db.notifications,
    userCustomPins: db.userCustomPins,
    serverTime: new Date().toISOString(),
  });
});

app.post('/api/sync', (req, res) => {
  const {
    clientDocs = [],
    clientAnns = [],
    clientSummons = [],
    clientPeer = [],
    clientConvs = [],
    clientMessages = [],
    clientPins = {},
  } = req.body || {};

  let changed = false;

  // Merge newly added client documents
  if (Array.isArray(clientDocs)) {
    for (const cDoc of clientDocs) {
      if (cDoc && cDoc.id && !db.documents.some(d => d.id === cDoc.id)) {
        db.documents.unshift(cDoc);
        changed = true;
      }
    }
  }

  // Merge announcements
  if (Array.isArray(clientAnns)) {
    for (const cAnn of clientAnns) {
      if (cAnn && cAnn.id && !db.announcements.some(a => a.id === cAnn.id)) {
        db.announcements.unshift(cAnn);
        changed = true;
      }
    }
  }

  // Merge summons
  if (Array.isArray(clientSummons)) {
    for (const cSum of clientSummons) {
      if (cSum && cSum.id && !db.summons.some(s => s.id === cSum.id)) {
        db.summons.unshift(cSum);
        changed = true;
      }
    }
  }

  // Merge peer exchanges
  if (Array.isArray(clientPeer)) {
    for (const cPost of clientPeer) {
      if (cPost && cPost.id && !db.peerExchanges.some(p => p.id === cPost.id)) {
        db.peerExchanges.unshift(cPost);
        changed = true;
      }
    }
  }

  // Merge private conversations
  if (Array.isArray(clientConvs)) {
    for (const cConv of clientConvs) {
      if (cConv && cConv.id && !db.privateConversations.some(c => c.id === cConv.id)) {
        db.privateConversations.unshift(cConv);
        changed = true;
      }
    }
  }

  // Merge private messages
  if (Array.isArray(clientMessages)) {
    for (const cMsg of clientMessages) {
      if (cMsg && cMsg.id && !db.privateMessages.some(m => m.id === cMsg.id)) {
        db.privateMessages.push(cMsg);
        changed = true;
      }
    }
  }

  // Merge custom employee passwords
  if (clientPins && typeof clientPins === 'object') {
    for (const [id, pin] of Object.entries(clientPins)) {
      if (pin && typeof pin === 'string' && pin.trim().length >= 4) {
        const lowerId = id.toLowerCase();
        if (!db.userCustomPins[lowerId]) {
          db.userCustomPins[lowerId] = pin.trim();
          changed = true;
        }
      }
    }
  }

  if (changed) {
    saveDatabase(db);
  }

  res.json({
    documents: db.documents,
    announcements: db.announcements,
    summons: db.summons,
    peerExchanges: db.peerExchanges,
    privateConversations: db.privateConversations,
    privateMessages: db.privateMessages,
    notifications: db.notifications,
    userCustomPins: db.userCustomPins,
    serverTime: new Date().toISOString(),
  });
});

// 3. Documents API
app.get('/api/documents', (req, res) => {
  res.json(db.documents);
});

// Helper: Normalize subject names & aliases to canonical IDs
function normalizeSubjectId(subj?: string): string {
  if (!subj) return 'math';
  const s = subj.trim().toLowerCase();
  if (s.includes('عرب') || s === 'arabic') return 'arabic';
  if (s.includes('رياض') || s === 'math') return 'math';
  if (s.includes('فيز') || s === 'physics') return 'physics';
  if (s.includes('طبيع') || s.includes('علوم') || s === 'science') return 'science';
  if (s.includes('فرنس') || s === 'french') return 'french';
  if (s.includes('انجل') || s.includes('إنجل') || s === 'english') return 'english';
  if (s.includes('تاريخ') || s.includes('جغراف') || s === 'history_geo') return 'history_geo';
  if (s.includes('إسلام') || s.includes('اسلام') || s === 'islamic') return 'islamic';
  if (s.includes('مدني') || s === 'civics') return 'civics';
  if (s.includes('بدني') || s.includes('رياضي') || s === 'sport') return 'sport';
  if (s.includes('رسم') || s.includes('تشكيل') || s === 'art') return 'art';
  if (s.includes('إعلام') || s.includes('اعلام') || s === 'informatics') return 'informatics';
  if (s.includes('إدار') || s.includes('ادار') || s === 'admin') return 'admin';
  return subj;
}

app.post('/api/documents', (req, res) => {
  const doc = req.body;
  if (!doc.title) {
    return res.status(400).json({ error: 'العنوان مطلوب' });
  }

  const targetClasses = Array.isArray(doc.targetClasses) && doc.targetClasses.length > 0 
    ? doc.targetClasses 
    : ['ALL'];
  const targetAudience = doc.targetAudience || (targetClasses.includes('ALL') ? 'all_students' : 'specific_class');

  const newDoc = {
    ...doc,
    id: doc.id || 'doc-' + Date.now(),
    subject: normalizeSubjectId(doc.subject),
    docType: doc.docType || 'lesson',
    fileFormat: doc.fileFormat || 'pdf',
    uploadDate: doc.uploadDate || new Date().toISOString(),
    downloadCount: doc.downloadCount || 0,
    targetClasses,
    targetAudience,
  };

  db.documents = [newDoc, ...db.documents.filter(d => d.id !== newDoc.id)];

  // Auto-generate notification for target classes / students
  const targetClassesStr = (newDoc.targetClasses || []).join('، ');
  const notif: AppNotification = {
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

  db.notifications = [notif, ...db.notifications];
  saveDatabase(db);

  res.status(201).json(newDoc);
});

function getMimeTypeByFormat(format?: string, filename?: string): string {
  const ext = (filename ? filename.split('.').pop() || '' : format || '').toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

app.get('/api/documents/:id/download', (req, res) => {
  const { id } = req.params;
  const doc = db.documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).send('الوثيقة غير موجودة');
  }

  doc.downloadCount = (doc.downloadCount || 0) + 1;
  saveDatabase(db);

  if (doc.fileDataUrl && typeof doc.fileDataUrl === 'string' && doc.fileDataUrl.startsWith('data:')) {
    const commaIndex = doc.fileDataUrl.indexOf(',');
    if (commaIndex !== -1) {
      const header = doc.fileDataUrl.slice(0, commaIndex);
      const base64Data = doc.fileDataUrl.slice(commaIndex + 1);
      const mimeMatch = header.match(/^data:([^;]+)/);
      const filename = doc.fileName || `${doc.title}.${doc.fileFormat || 'pdf'}`;
      const mime = mimeMatch ? mimeMatch[1] : getMimeTypeByFormat(doc.fileFormat, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.send(buffer);
    }
  }

  const filename = doc.fileName || `${doc.title}.${doc.fileFormat || 'pdf'}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(`متوسطة الشهيد بن نعمة مصطفى (غليزان)
عنوان الوثيقة: ${doc.title}
المادة: ${doc.subject}
الأستاذ المشرف: ${doc.authorName}
تاريخ الرفع: ${doc.uploadDate}
الأقسام المعنية: ${(doc.targetClasses || []).join('، ')}

توجيهات بيداغوجية:
${doc.description || 'يرجى من جميع التلاميذ المعنيين الاطلاع على الوثيقة وإنجاز المطلوب.'}
`);
});

// Download Announcement Attachment
app.get('/api/announcements/:id/download', (req, res) => {
  const { id } = req.params;
  const ann = db.announcements.find(a => a.id === id);
  if (!ann) {
    return res.status(404).send('الإعلان غير موجود');
  }

  if (ann.fileDataUrl && typeof ann.fileDataUrl === 'string' && ann.fileDataUrl.startsWith('data:')) {
    const commaIndex = ann.fileDataUrl.indexOf(',');
    if (commaIndex !== -1) {
      const header = ann.fileDataUrl.slice(0, commaIndex);
      const base64Data = ann.fileDataUrl.slice(commaIndex + 1);
      const mimeMatch = header.match(/^data:([^;]+)/);
      const filename = ann.fileName || `${ann.title}.${ann.fileFormat || 'pdf'}`;
      const mime = mimeMatch ? mimeMatch[1] : getMimeTypeByFormat(ann.fileFormat, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.send(buffer);
    }
  }

  const filename = ann.fileName || `${ann.title.replace(/\s+/g, '_')}.txt`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(`الجمهورية الجزائرية الديمقراطية الشعبية
وزارة التربية الوطنية
متوسطة الشهيد بن نعمة مصطفى - وادي ارهيو (ولاية غليزان)
----------------------------------------------------------------------
وثيقة رسمية ومرفق إداري: ${ann.title}
تاريخ الصدور: ${new Date(ann.createdAt).toLocaleDateString('ar-DZ')}
جهة الإصدار: ${ann.authorName}
----------------------------------------------------------------------
نص الإعلان والتعليمات:
${ann.content}
`);
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  db.documents = db.documents.filter(d => d.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// 4. Announcements API
app.get('/api/announcements', (req, res) => {
  res.json(db.announcements);
});

app.post('/api/announcements', (req, res) => {
  const ann = req.body;
  const newAnn = {
    ...ann,
    id: ann.id || 'ann-' + Date.now(),
    createdAt: ann.createdAt || new Date().toISOString(),
    views: ann.views || 1,
  };

  db.announcements = [newAnn, ...db.announcements.filter(a => a.id !== newAnn.id)];

  // Create notification
  const notif: AppNotification = {
    id: 'notif-ann-' + Date.now(),
    type: 'announcement',
    title: `إعلان رسمي جديد: ${newAnn.title}`,
    message: newAnn.content.slice(0, 140) + '...',
    targetRole: newAnn.target || 'all',
    sourceAuthorName: newAnn.authorName || 'إدارة المؤسسة',
    sourceId: newAnn.id,
    createdAt: new Date().toISOString(),
    readBy: [],
  };

  db.notifications = [notif, ...db.notifications];
  saveDatabase(db);

  res.status(201).json(newAnn);
});

app.delete('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  db.announcements = db.announcements.filter(a => a.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// 5. Summons API
app.get('/api/summons', (req, res) => {
  res.json(db.summons);
});

app.post('/api/summons', (req, res) => {
  const summon = req.body;
  const newSummon = {
    ...summon,
    id: summon.id || 'sum-' + Date.now(),
    issuedAt: summon.issuedAt || new Date().toISOString(),
    status: summon.status || 'sent',
  };

  db.summons = [newSummon, ...db.summons.filter(s => s.id !== newSummon.id)];

  // Create private summon notification for this student
  const notif: AppNotification = {
    id: 'notif-sum-' + Date.now(),
    type: 'summon',
    title: `استدعاء ولي أمر رسمي: التلميذ(ة) ${newSummon.studentName}`,
    message: `تم إصدار استدعاء رسمي للحضور يوم ${newSummon.appointmentDate} على الساعة ${newSummon.appointmentTime}.`,
    targetUserId: newSummon.studentId,
    sourceAuthorName: 'إدارة المؤسسة (الناظر / المدير)',
    sourceId: newSummon.id,
    createdAt: new Date().toISOString(),
    readBy: [],
  };

  db.notifications = [notif, ...db.notifications];
  saveDatabase(db);

  res.status(201).json(newSummon);
});

app.patch('/api/summons/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.summons = db.summons.map(s => (s.id === id ? { ...s, status } : s));
  saveDatabase(db);
  res.json({ success: true });
});

// 6. Peer Exchanges API (قناة التضامن بين تلاميذ القسم)
app.get('/api/peer-exchanges', (req, res) => {
  const { classId } = req.query;
  if (classId) {
    return res.json(db.peerExchanges.filter(p => p.classId === classId));
  }
  res.json(db.peerExchanges);
});

app.post('/api/peer-exchanges', (req, res) => {
  const post = req.body;
  const newPost = {
    ...post,
    id: post.id || 'peer-' + Date.now(),
    createdAt: post.createdAt || new Date().toISOString(),
    thanksCount: 0,
    thankedBy: [],
    replies: [],
  };

  db.peerExchanges = [newPost, ...db.peerExchanges.filter(p => p.id !== newPost.id)];

  // Notification for classmates
  const notif: AppNotification = {
    id: 'notif-peer-' + Date.now(),
    type: 'peer_post',
    title: `مشاركة جديدة في قسم ${newPost.className || ''}`,
    message: `${newPost.studentName}: ${newPost.title}`,
    targetClassId: newPost.classId,
    targetRole: 'students',
    sourceAuthorName: newPost.studentName,
    sourceId: newPost.id,
    createdAt: new Date().toISOString(),
    readBy: [],
  };

  db.notifications = [notif, ...db.notifications];
  saveDatabase(db);

  res.status(201).json(newPost);
});

app.post('/api/peer-exchanges/:id/thank', (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body;
  const post = db.peerExchanges.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const hasThanked = post.thankedBy.includes(studentId);
  post.thanksCount = hasThanked ? Math.max(0, post.thanksCount - 1) : post.thanksCount + 1;
  post.thankedBy = hasThanked
    ? post.thankedBy.filter((sid: string) => sid !== studentId)
    : [...post.thankedBy, studentId];

  saveDatabase(db);
  res.json(post);
});

app.post('/api/peer-exchanges/:id/reply', (req, res) => {
  const { id } = req.params;
  const reply = req.body;
  const post = db.peerExchanges.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const newReply = {
    ...reply,
    id: 'rep-' + Date.now(),
    createdAt: new Date().toISOString(),
  };

  post.replies = [...(post.replies || []), newReply];

  // Notify original author if someone else replied
  if (post.studentId !== reply.studentId) {
    db.notifications = [
      {
        id: 'notif-reply-' + Date.now(),
        type: 'peer_reply',
        title: `رد جديد على درسك من ${reply.studentName}`,
        message: `${reply.content.slice(0, 100)}...`,
        targetUserId: post.studentId,
        sourceAuthorName: reply.studentName,
        sourceId: post.id,
        createdAt: new Date().toISOString(),
        readBy: [],
      },
      ...db.notifications,
    ];
  }

  saveDatabase(db);
  res.status(201).json(post);
});

app.delete('/api/peer-exchanges/:id', (req, res) => {
  const { id } = req.params;
  db.peerExchanges = db.peerExchanges.filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// 7. Private Student Conversations API (المحادثات الخاصة والسرية بين تلاميذ القسم)
app.get('/api/conversations', (req, res) => {
  const { studentId } = req.query;
  if (!studentId || typeof studentId !== 'string') {
    return res.json([]);
  }
  const convs = (db.privateConversations || []).filter(c =>
    Array.isArray(c.participantIds) && c.participantIds.includes(studentId)
  );
  res.json(convs);
});

app.post('/api/conversations', (req, res) => {
  const conv = req.body;
  if (!conv || !Array.isArray(conv.participantIds)) {
    return res.status(400).json({ error: 'بيانات المحادثة غير صالحة' });
  }

  const existingIndex = (db.privateConversations || []).findIndex(c => c.id === conv.id);
  if (existingIndex !== -1) {
    db.privateConversations[existingIndex] = { ...db.privateConversations[existingIndex], ...conv };
  } else {
    db.privateConversations = [conv, ...(db.privateConversations || [])];
  }

  saveDatabase(db);
  res.status(201).json(conv);
});

app.get('/api/conversations/:id/messages', (req, res) => {
  const { id } = req.params;
  const { studentId } = req.query;
  const conv = (db.privateConversations || []).find(c => c.id === id);

  // Privacy verification: Only authorized participants can fetch messages
  if (conv && studentId && typeof studentId === 'string') {
    if (!conv.participantIds.includes(studentId)) {
      return res.status(403).json({ error: 'عذراً، هذه محادثة خاصة وسرية لا يمكن الاطلاع عليها إلا للمشاركين' });
    }
  }

  const messages = (db.privateMessages || []).filter(m => m.conversationId === id);
  res.json(messages);
});

app.post('/api/conversations/:id/messages', (req, res) => {
  const { id } = req.params;
  const msg = req.body;
  const newMsg = {
    ...msg,
    id: msg.id || 'pmsg-' + Date.now(),
    conversationId: id,
    createdAt: msg.createdAt || new Date().toISOString(),
  };

  db.privateMessages = [...(db.privateMessages || []), newMsg];

  // Update conversation state
  const conv = (db.privateConversations || []).find(c => c.id === id);
  if (conv) {
    conv.lastMessage = newMsg.content;
    conv.lastMessageAt = newMsg.createdAt;
    conv.lastSenderName = newMsg.senderName;
    conv.updatedAt = newMsg.createdAt;

    // Send private alert notification to the other participant(s) ONLY
    const otherParticipants = (conv.participantIds || []).filter((pid: string) => pid !== newMsg.senderId);
    for (const recipientId of otherParticipants) {
      const notif: AppNotification = {
        id: 'notif-pmsg-' + Date.now() + '-' + recipientId,
        type: 'private_message',
        title: `رسالة خاصة جديدة من: ${newMsg.senderName}`,
        message: newMsg.content.slice(0, 100),
        targetUserId: recipientId,
        sourceAuthorName: newMsg.senderName,
        sourceId: conv.id,
        createdAt: new Date().toISOString(),
        readBy: [],
      };
      db.notifications = [notif, ...db.notifications];
    }
  }

  saveDatabase(db);
  res.status(201).json(newMsg);
});

app.delete('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  db.privateConversations = (db.privateConversations || []).filter(c => c.id !== id);
  db.privateMessages = (db.privateMessages || []).filter(m => m.conversationId !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// 7. Notifications API
app.get('/api/notifications', (req, res) => {
  const { userId, role, classId } = req.query;

  // Filter notifications relevant to this user
  const userNotifs = db.notifications.filter(n => {
    // If specific target user ID
    if (n.targetUserId && userId && n.targetUserId === userId) return true;

    // If specific class
    if (n.targetClassId && classId && n.targetClassId === classId) return true;

    // Target roles
    if (n.targetRole === 'all') return true;
    if (role && n.targetRole === role) return true;
    if (role && role !== 'student' && n.targetRole === 'teachers') return true;
    if (role === 'student' && n.targetRole === 'students') return true;

    return false;
  });

  res.json(userNotifs.slice(0, 30));
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { userId, notificationIds } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  db.notifications = db.notifications.map(n => {
    if (!notificationIds || notificationIds.includes(n.id)) {
      if (!n.readBy.includes(userId)) {
        return { ...n, readBy: [...n.readBy, userId] };
      }
    }
    return n;
  });

  saveDatabase(db);
  res.json({ success: true });
});

// 8. Passwords API (Sync updated employee passwords across devices)
app.get('/api/users/pins', (req, res) => {
  res.json(db.userCustomPins);
});

app.post('/api/users/update-password', (req, res) => {
  const { identifier, pin } = req.body;
  if (!identifier || !pin || pin.length < 4) {
    return res.status(400).json({ error: 'كلمة السر يجب أن تتكون من 4 خانات على الأقل.' });
  }

  db.userCustomPins[identifier.toLowerCase()] = pin.trim();
  saveDatabase(db);
  res.json({ success: true, identifier: identifier.toLowerCase() });
});

// ================= SPA & VITE DEV SERVER MOUNTING =================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    console.log('[Server] Starting in development mode with Vite middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Starting in production mode serving static dist...');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 🚀 Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
