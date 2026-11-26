import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Building,
  CheckCircle,
  Database,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Megaphone,
  Paperclip,
  Plus,
  Radio,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { MOCK_USERS, SCHOOL_CLASSES, SCHOOL_NAME, SUBJECTS } from '../../data/mockData';
import {
  deleteAnnouncement,
  deleteDocument,
  getAllUsers,
  getPendingResetRequestsCount,
  fetchPasswordResetRequestsFromServer,
  isPresenceOnline,
  isUserWithinLastActiveGrace,
  saveAnnouncementAsync,
  saveDocument,
  subscribeToLivePresence,
  syncWithServer,
} from '../../services/storageService';
import { isFirestoreQuotaExceeded } from '../../services/firestoreService';
import {
  AnnouncementPriority,
  AnnouncementTarget,
  DocType,
  DocumentTargetAudience,
  FileFormat,
  ParentSummon,
  SchoolAnnouncement,
  SchoolDocument,
  SubjectId,
  UserPresenceRecord,
  UserProfile,
} from '../../types';
import { AddStudentModal } from '../common/AddStudentModal';
import { AnnouncementCard } from '../common/AnnouncementCard';
import { DocumentCard } from '../common/DocumentCard';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal';
import { DatabaseDebugView } from './DatabaseDebugView';
import { StudentChatSupervisionPanel } from '../common/StudentChatSupervisionPanel';
import { StaffAccountsManager } from './StaffAccountsManager';
import { StudentActivationCodesManager } from './StudentActivationCodesManager';
import { processAndCompressFile } from '../../utils/fileCompressor';

interface DirectorViewProps {
  currentUser: UserProfile;
  documents: SchoolDocument[];
  announcements: SchoolAnnouncement[];
  summons: ParentSummon[];
  onRefreshData: () => void;
  presenceRecords?: UserPresenceRecord[];
  presenceNowTs?: number;
  checkUserOnline?: (identifier: string, record?: UserPresenceRecord | null, now?: number) => boolean;
}

export const DirectorView: React.FC<DirectorViewProps> = ({
  currentUser,
  documents,
  announcements,
  summons,
  onRefreshData,
  presenceRecords: propPresenceRecords,
  presenceNowTs: propPresenceNowTs,
  checkUserOnline,
}) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'new-announcement' | 'documents' | 'upload-doc' | 'staff-accounts' | 'student-codes' | 'online-users' | 'roster' | 'chat-supervision'>('announcements');
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [studentRefreshSignal, setStudentRefreshSignal] = useState(0);

  // Live Presence State (Online Students & Teachers)
  const [localPresenceRecords, setLocalPresenceRecords] = useState<UserPresenceRecord[]>([]);
  const [localPresenceNowTs, setLocalPresenceNowTs] = useState<number>(() => Date.now());
  const presenceRecords = propPresenceRecords ?? localPresenceRecords;
  const presenceNowTs = propPresenceNowTs ?? localPresenceNowTs;
  const isUserConnected = React.useCallback(
    (identifier: string, record?: UserPresenceRecord | null, now = presenceNowTs) => {
      if (checkUserOnline) {
        return checkUserOnline(identifier, record, now);
      }
      return isPresenceOnline(record, now) || isUserWithinLastActiveGrace(identifier, record, now);
    },
    [checkUserOnline, presenceNowTs]
  );
  const [presenceSearch, setPresenceSearch] = useState('');
  const [presenceClassFilter, setPresenceClassFilter] = useState<string>('ALL');
  const [presenceViewMode, setPresenceViewMode] = useState<'online' | 'all'>('online');

  // New Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTarget, setAnnTarget] = useState<AnnouncementTarget>('all');
  const [annPriority, setAnnPriority] = useState<AnnouncementPriority>('important');
  const [annBadge, setAnnBadge] = useState('منشور المدير');
  const [annSuccess, setAnnSuccess] = useState<string | null>(null);
  const [isSubmittingAnn, setIsSubmittingAnn] = useState(false);
  const [annUploadedFile, setAnnUploadedFile] = useState<{
    name: string;
    size: string;
    format: FileFormat;
    dataUrl?: string;
  } | null>(null);
  const annFileInputRef = useRef<HTMLInputElement>(null);
  const annTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annDraftRef = useRef({ title: '', content: '' });
  annDraftRef.current = { title: annTitle, content: annContent };

  // Administrative Document Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docFileFormat, setDocFileFormat] = useState<FileFormat>('pdf');
  const [docType, setDocType] = useState<DocType>('circular');
  const [docAudience, setDocAudience] = useState<'all' | 'teachers' | 'students' | 'specific_class'>('all');
  const [docSelectedClasses, setDocSelectedClasses] = useState<string[]>(['4AM-1']);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; dataUrl?: string } | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Student Roster States
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target Filter for Announcements List
  const [filterTarget, setFilterTarget] = useState<AnnouncementTarget | 'ALL'>('ALL');

  // Staff Category Filter for Roster List
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<'all' | 'teachers' | 'admin' | 'supervisors' | 'workers'>('all');

  // Pending password reset requests counter (Requiring director approval)
  const [pendingResetCount, setPendingResetCount] = useState<number>(() => getPendingResetRequestsCount());
  const [cloudQuotaReached, setCloudQuotaReached] = useState<boolean>(() => isFirestoreQuotaExceeded());

  React.useEffect(() => {
    const handleQuotaEvent = () => setCloudQuotaReached(true);
    window.addEventListener('firestore-quota-exceeded', handleQuotaEvent);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuotaEvent);
  }, []);

  React.useEffect(() => {
    fetchPasswordResetRequestsFromServer(false).then(() => {
      setPendingResetCount(getPendingResetRequestsCount());
    });

    const handleReqUpdate = () => {
      setPendingResetCount(getPendingResetRequestsCount());
    };

    window.addEventListener('password-requests-updated', handleReqUpdate);
    const interval = setInterval(() => {
      fetchPasswordResetRequestsFromServer(false).then(() => {
        setPendingResetCount(getPendingResetRequestsCount());
      });
    }, 15_000);

    return () => {
      window.removeEventListener('password-requests-updated', handleReqUpdate);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (propPresenceRecords !== undefined) {
      return () => {
        if (annTimerRef.current) clearTimeout(annTimerRef.current);
      };
    }
    const unsubscribe = subscribeToLivePresence(records => {
      setLocalPresenceRecords(records);
      setLocalPresenceNowTs(Date.now());
    });
    const expiryTick = setInterval(() => {
      setLocalPresenceNowTs(Date.now());
    }, 5_000);

    return () => {
      unsubscribe();
      clearInterval(expiryTick);
      if (annTimerRef.current) clearTimeout(annTimerRef.current);
    };
  }, [propPresenceRecords]);

  const filteredAnnouncements = announcements.filter(a => {
    if (filterTarget === 'ALL') return true;
    return a.target === filterTarget;
  });

  const handleAnnFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let format: FileFormat = 'pdf';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') format = 'pdf';
    else if (ext === 'docx' || ext === 'doc') format = 'docx';
    else if (ext === 'xlsx' || ext === 'xls') format = 'xlsx';
    else if (ext === 'pptx' || ext === 'ppt') format = 'pptx';
    else if (file.type.startsWith('image/')) format = 'image';

    try {
      const processed = await processAndCompressFile(file);
      setAnnUploadedFile({
        name: processed.name,
        size: processed.sizeFormatted,
        format,
        dataUrl: processed.dataUrl,
      });
    } catch {
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;
      const reader = new FileReader();
      reader.onload = () => {
        setAnnUploadedFile({
          name: file.name,
          size: formattedSize,
          format,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreviewAnnAttachment = (ann: SchoolAnnouncement) => {
    if (ann.fileName) {
      setPreviewDoc({
        id: ann.id,
        title: ann.title,
        description: ann.content,
        subject: 'admin',
        docType: 'circular',
        fileFormat: ann.fileFormat || 'pdf',
        fileName: ann.fileName,
        fileSize: ann.fileSize || '1 MB',
        fileDataUrl: ann.fileDataUrl,
        authorId: 'director',
        authorName: ann.authorName,
        authorRole: 'director',
        targetClasses: ['ALL'],
        uploadDate: ann.createdAt,
        downloadCount: 0,
      });
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAnn || !annTitle.trim() || !annContent.trim()) return;

    if (annTimerRef.current) {
      clearTimeout(annTimerRef.current);
      annTimerRef.current = null;
    }

    setIsSubmittingAnn(true);
    try {
      const result = await saveAnnouncementAsync({
        title: annTitle.trim(),
        content: annContent.trim(),
        target: annTarget,
        priority: annPriority,
        authorName: `${currentUser.name} (مدير المتوسطة)`,
        authorRole: 'director',
        badge: annBadge.trim() || 'بلاغ الإدارة',
        fileName: annUploadedFile?.name,
        fileSize: annUploadedFile?.size,
        fileFormat: annUploadedFile?.format,
        fileDataUrl: annUploadedFile?.dataUrl,
      });

      setFilterTarget('ALL');
      onRefreshData();
      setAnnSuccess(
        result.serverSaved || result.cloudSaved
          ? 'تم نشر الإعلان وإرساله للتلاميذ والأساتذة بنجاح!'
          : 'تم حفظ الإعلان محلياً وسيرسل تلقائياً عند استقرار الاتصال.'
      );

      setAnnTitle('');
      setAnnContent('');
      setAnnUploadedFile(null);
      if (annFileInputRef.current) annFileInputRef.current.value = '';

      annTimerRef.current = setTimeout(() => {
        setAnnSuccess(null);
        // Only auto-switch if the Director hasn't already started typing a second announcement
        if (!annDraftRef.current.title.trim() && !annDraftRef.current.content.trim()) {
          setActiveTab('announcements');
        }
      }, 1500);
    } finally {
      setIsSubmittingAnn(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let format: FileFormat = 'pdf';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') format = 'pdf';
    else if (ext === 'docx' || ext === 'doc') format = 'docx';
    else if (ext === 'xlsx' || ext === 'xls') format = 'xlsx';
    else if (ext === 'pptx' || ext === 'ppt') format = 'pptx';
    else if (file.type.startsWith('image/')) format = 'image';

    setDocFileFormat(format);

    try {
      const processed = await processAndCompressFile(file);
      setUploadedFile({
        name: processed.name,
        size: processed.sizeFormatted,
        dataUrl: processed.dataUrl,
      });
    } catch {
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFile({
          name: file.name,
          size: formattedSize,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAdminDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    setIsUploading(true);

    const fileName =
      uploadedFile?.name ||
      `${docTitle.replace(/\s+/g, '_')}.${docFileFormat === 'docx' ? 'docx' : docFileFormat}`;
    const fileSize = uploadedFile?.size || '1.5 MB';

    const targetAudience: DocumentTargetAudience =
      docAudience === 'teachers'
        ? 'teachers'
        : docAudience === 'specific_class'
        ? 'specific_class'
        : 'all_students';

    const targetClasses =
      docAudience === 'specific_class' && docSelectedClasses.length > 0
        ? docSelectedClasses
        : ['ALL'];

    saveDocument({
      title: docTitle.trim(),
      description:
        docDescription.trim() ||
        'منشور ووثيقة إدارية رسمية صادرة عن مديرية متوسطة الشهيد بن نعمة مصطفى.',
      subject: 'admin',
      docType,
      fileFormat: docFileFormat,
      fileName,
      fileSize,
      fileDataUrl: uploadedFile?.dataUrl,
      authorId: currentUser.id,
      authorName: `${currentUser.name} (المدير)`,
      authorRole: 'director',
      targetClasses,
      targetAudience,
    });

    try {
      await syncWithServer();
    } catch {}

    setIsUploading(false);
    setDocSuccess(`تم نشر وتحميل الوثيقة الإدارية "${docTitle}" بنجاح وحفظها في قاعدة البيانات!`);
    onRefreshData();

    setDocTitle('');
    setDocDescription('');
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      setDocSuccess(null);
      setActiveTab('documents');
    }, 1800);
  };

  const totalDownloads = documents.reduce((acc, d) => acc + (d.downloadCount || 0), 0);
  const totalStudentsApprox = SCHOOL_CLASSES.reduce((acc, c) => acc + c.studentCount, 0);

  const allDirectoryUsers = getAllUsers();
  const registeredStudents = allDirectoryUsers.filter(u => u.role === 'student');
  const allTeachers = allDirectoryUsers.filter(u => u.role === 'teacher');

  const presenceById = React.useMemo(() => {
    const map = new Map<string, UserPresenceRecord>();
    for (const rec of presenceRecords) {
      const key = rec.identifier.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (!existing || rec.lastSeen >= existing.lastSeen) {
        map.set(key, rec);
      }
    }
    return map;
  }, [presenceRecords]);

  const userDirectoryById = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const u of allDirectoryUsers) {
      map.set(u.identifier.trim().toLowerCase(), u);
    }
    return map;
  }, [allDirectoryUsers]);

  const onlineStudentRecords = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ user: UserProfile; presence: UserPresenceRecord }> = [];
    for (const rec of presenceRecords) {
      if (rec.role !== 'student' || !isUserConnected(rec.identifier, rec, presenceNowTs)) continue;
      const normId = rec.identifier.trim().toLowerCase();
      if (seen.has(normId)) continue;
      seen.add(normId);
      const dirUser = userDirectoryById.get(normId);
      list.push({
        user: dirUser || {
          id: normId,
          identifier: rec.identifier,
          name: rec.name,
          role: 'student',
          classId: rec.classId,
          className: rec.className,
        },
        presence: rec,
      });
    }
    return list.sort((a, b) => b.presence.lastSeen - a.presence.lastSeen);
  }, [presenceRecords, presenceNowTs, userDirectoryById, isUserConnected]);

  const onlineTeacherRecords = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ user: UserProfile; presence: UserPresenceRecord }> = [];
    for (const rec of presenceRecords) {
      if (rec.role !== 'teacher' || !isUserConnected(rec.identifier, rec, presenceNowTs)) continue;
      const normId = rec.identifier.trim().toLowerCase();
      if (seen.has(normId)) continue;
      seen.add(normId);
      const dirUser = userDirectoryById.get(normId);
      list.push({
        user: dirUser || {
          id: normId,
          identifier: rec.identifier,
          name: rec.name,
          role: 'teacher',
          title: rec.title,
        },
        presence: rec,
      });
    }
    return list.sort((a, b) => b.presence.lastSeen - a.presence.lastSeen);
  }, [presenceRecords, presenceNowTs, userDirectoryById, isUserConnected]);

  const formatPresenceAgo = (lastSeen?: number) => {
    if (!lastSeen) return 'غير متصل';
    const diff = Math.max(0, presenceNowTs - lastSeen);
    if (diff < 15_000) return 'نشط الآن';
    if (diff < 60_000) return `منذ ${Math.floor(diff / 1000)} ثا`;
    return `منذ ${Math.floor(diff / 60_000)} د`;
  };

  const filteredStudents = registeredStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.activationCode && s.activationCode.includes(q)) ||
      (s.className && s.className.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Director Executive Banner */}
      <div className="print:hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-white/15">
              <Building className="w-4 h-4 text-emerald-300" />
              <span>الإدارة العامة - مكتب السيد المدير</span>
              <span className="opacity-60">•</span>
              <span>الرقم المهني: {currentUser.identifier}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              أهلاً بكم، {currentUser.name}
            </h1>

            <p className="text-emerald-100 text-sm max-w-xl">
              إدارة شؤون متوسطة الشهيد بن نعمة مصطفى، بث الإعلانات المستهدفة للتلاميذ والأساتذة والموظفين، ومتابعة وتحميل الوثائق الإدارية والبيداغوجية.
            </p>
          </div>

          {/* Key School Metrics + Live Connected Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('online-users')}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-md rounded-2xl p-3 border border-emerald-400/40 text-center transition-all cursor-pointer group"
              title="عرض التلاميذ المتصلين الآن"
            >
              <span className="text-[11px] text-emerald-100 flex items-center justify-center gap-1.5 mb-0.5 font-bold">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                <span>تلاميذ متصلون</span>
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 group-hover:text-white transition-colors">
                {onlineStudentRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('online-users')}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-md rounded-2xl p-3 border border-emerald-400/40 text-center transition-all cursor-pointer group"
              title="عرض الأساتذة المتصلين الآن"
            >
              <span className="text-[11px] text-emerald-100 flex items-center justify-center gap-1.5 mb-0.5 font-bold">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                <span>أساتذة متصلون</span>
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 group-hover:text-white transition-colors">
                {onlineTeacherRecords.length}
              </span>
            </button>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-emerald-200 block mb-0.5 font-medium">مجموع الوثائق</span>
              <span className="text-xl sm:text-2xl font-black text-white">{documents.length}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-emerald-200 block mb-0.5 font-medium">تحميلات التلاميذ</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{totalDownloads}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-emerald-200 block mb-0.5 font-medium">الإعلانات النشطة</span>
              <span className="text-xl sm:text-2xl font-black text-white">{announcements.length}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-emerald-200 block mb-0.5 font-medium">تلاميذ المؤسسة</span>
              <span className="text-xl sm:text-2xl font-black text-white">{totalStudentsApprox}</span>
            </div>
          </div>
        </div>
      </div>

      {cloudQuotaReached && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-950 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              تنبيه: تم بلوغ الحد اليومي المجاني لقراءات قاعدة البيانات السحابية (Firestore) لهذا اليوم.
            </p>
            <p className="text-xs text-amber-800">
              المزامنة المباشرة عبر خادم المنصة تعمل بشكل طبيعي، وتُعاد مزامنة السحابة تلقائياً عند تجدد الحصة اليومية.
            </p>
          </div>
        </div>
      )}

      {/* Security Alert: Pending Password Reset Requests */}
      {pendingResetCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/10 border-2 border-rose-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-rose-600 text-white shadow-md animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-900 text-sm sm:text-base">
                  تنبيه أمان ومصادقة عاجل: يوجد {pendingResetCount} طلب استرجاع كلمة سر بانتظار موافقتك!
                </h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                  مطلوب الإجراء
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                لحماية حسابات الأساتذة والموظفين من الاختراق، لن يتمكن أصحاب الطلبات من الدخول حتى تقوم شخصياً بالمصادقة على طلباتهم وتفعيلها من لوحة التحكم.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('staff-accounts')}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-black transition-all shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>فتح لوحة المصادقة والتفعيل الآن</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>لوحة الإعلانات الرسمية ({announcements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new-announcement')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'new-announcement'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>نشر إعلان جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'documents'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>بنك الوثائق ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload-doc')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'upload-doc'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>نشر وثيقة إدارية</span>
          </button>

          <button
            onClick={() => setActiveTab('staff-accounts')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'staff-accounts'
                ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-500/40'
                : 'bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <KeyRound
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'staff-accounts' ? 'text-yellow-300' : 'text-emerald-700'
              }`}
            />
            <span>حسابات الموظفين (42)</span>
            {pendingResetCount > 0 ? (
              <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>{pendingResetCount} طلب معلق</span>
              </span>
            ) : (
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                لوحة التحكم
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('student-codes')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'student-codes'
                ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-500/40'
                : 'bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            <KeyRound
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'student-codes' ? 'text-yellow-300' : 'text-amber-700'
              }`}
            />
            <span>رموز تفعيل التلاميذ (6 أرقام)</span>
            <span className="text-[10px] bg-emerald-700 text-white font-black px-2 py-0.5 rounded-full">
              {registeredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('online-users')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'online-users'
                ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400/40'
                : 'bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span>المتصلون الآن</span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeTab === 'online-users'
                  ? 'bg-white text-emerald-900'
                  : 'bg-emerald-700 text-white'
              }`}
            >
              {onlineStudentRecords.length + onlineTeacherRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'roster'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>دليل الطاقم والأقسام</span>
          </button>

          <button
            onClick={() => setActiveTab('chat-supervision')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'chat-supervision'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Shield
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'chat-supervision' ? 'text-yellow-300' : 'text-teal-700'
              }`}
            />
            <span>مراقبة محادثات التلاميذ</span>
            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
              رقابة تربوية
            </span>
          </button>
        </div>

        {/* Quick Actions: Add New Student + Diagnostic Storage Debug Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddStudentModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs active:scale-95 cursor-pointer"
            title="إضافة تلميذ جديد وتوليد رمز تفعيل من 6 أرقام فوراً"
          >
            <Plus className="w-4 h-4 text-yellow-300" />
            <span>إضافة تلميذ + رمز تفعيل</span>
          </button>

          <button
            onClick={() => setShowDebugModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs active:scale-95 cursor-pointer"
            title="فحص محتويات localStorage والبيانات الخام وتشخيص مشاكل التخزين"
          >
            <Database className="w-4 h-4 text-amber-700" />
            <span>فحص قاعدة البيانات</span>
          </button>
        </div>
      </div>

      {/* Tab: Announcements Management */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-bold text-slate-700 ml-1">تصفية حسب الفئة المستهدفة:</span>
              {[
                { id: 'ALL', label: 'جميع الإعلانات' },
                { id: 'students', label: 'الموجهة للتلاميذ' },
                { id: 'teachers', label: 'الموجهة للأساتذة' },
                { id: 'staff', label: 'الموجهة للموظفين' },
                { id: 'all', label: 'إعلانات عامة' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterTarget(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    filterTarget === f.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('new-announcement')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer transition-all active:scale-95"
            >
              <Paperclip className="w-4 h-4 text-emerald-200" />
              <span>نشر إعلان جديد مع إرفاق وثيقة</span>
            </button>
          </div>

          <div className="space-y-4">
            {filteredAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                currentUser={currentUser}
                onPreviewAttachment={handlePreviewAnnAttachment}
                onDelete={id => {
                  if (window.confirm('هل تريد حذف هذا الإعلان نهائياً؟')) {
                    deleteAnnouncement(id);
                    onRefreshData();
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab: New Targeted Announcement Form */}
      {activeTab === 'new-announcement' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-emerald-700" />
              <span>نشر إعلان رسمي موجه من المدير</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              حدد الفئة المستهدفة (التلاميذ، الأساتذة، أو الموظفون والعمال) ودرجة الأهمية.
            </p>
          </div>

          {annSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{annSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (annTimerRef.current) clearTimeout(annTimerRef.current);
                  setAnnSuccess(null);
                  setFilterTarget('ALL');
                  setActiveTab('announcements');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
              >
                عرض لوحة الإعلانات ({announcements.length})
              </button>
            </div>
          )}

          <form onSubmit={handleCreateAnnouncement} className="space-y-5">
            {/* Target Audience Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                الفئة المستهدفة بالإعلان: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'students', label: 'التلاميذ', desc: 'يظهر في فضاء التلميذ' },
                  { id: 'teachers', label: 'الأساتذة', desc: 'يظهر في فضاء الأساتذة' },
                  { id: 'staff', label: 'الموظفون والعمال', desc: 'الطاقم الإداري والمهني' },
                  { id: 'all', label: 'إعلان عام للجميع', desc: 'لكافة أفراد المؤسسة' },
                ].map(t => {
                  const isSelected = annTarget === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAnnTarget(t.id as AnnouncementTarget)}
                      className={`p-3 rounded-2xl border text-right transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان الإعلان أو البلاغ: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                placeholder="مثال: رزنامة الامتحانات الموحدة ومجالس الأقسام للفصل الثاني"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-medium"
              />
            </div>

            {/* Priority and Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  درجة الأهمية:
                </label>
                <select
                  value={annPriority}
                  onChange={e => setAnnPriority(e.target.value as AnnouncementPriority)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white"
                >
                  <option value="normal">عادي</option>
                  <option value="important">هام</option>
                  <option value="urgent">عاجل جداً ومهم</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شارة الإعلان:
                </label>
                <input
                  type="text"
                  value={annBadge}
                  onChange={e => setAnnBadge(e.target.value)}
                  placeholder="مثال: بلاغ الإدارة / منشور وزاري"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نص الإعلان والتعليمات: <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={annContent}
                onChange={e => setAnnContent(e.target.value)}
                placeholder="اكتب هنا نص الإعلان والتعليمات الموجهة..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none resize-none"
              />
            </div>

            {/* Attachment Box for Announcements */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-emerald-700" />
                  <span>إرفاق وثيقة أو منشور مع الإعلان (اختياري - PDF أو Word أو صورة):</span>
                </label>
                {annUploadedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnnUploadedFile(null);
                      if (annFileInputRef.current) annFileInputRef.current.value = '';
                    }}
                    className="text-xs text-red-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المرفق</span>
                  </button>
                )}
              </div>

              <input
                ref={annFileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.pptx,image/*"
                onChange={handleAnnFileChange}
                className="hidden"
              />

              {annUploadedFile ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-emerald-300 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{annUploadedFile.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{annUploadedFile.size} • جاهز للنشر والمزامنة</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {annUploadedFile.dataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewDoc({
                            id: 'temp-preview',
                            title: annTitle || annUploadedFile.name,
                            description: annContent || 'معاينة المرفق قبل النشر',
                            subject: 'admin',
                            docType: 'circular',
                            fileFormat: annUploadedFile.format,
                            fileName: annUploadedFile.name,
                            fileSize: annUploadedFile.size,
                            fileDataUrl: annUploadedFile.dataUrl,
                            authorId: currentUser.id,
                            authorName: currentUser.name,
                            authorRole: 'director',
                            targetClasses: ['ALL'],
                            uploadDate: new Date().toISOString().split('T')[0],
                            downloadCount: 0,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                      تم إرفاق الملف ✓
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => annFileInputRef.current?.click()}
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={async e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && annFileInputRef.current) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      annFileInputRef.current.files = dt.files;
                      annFileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                  className="border-2 border-dashed border-emerald-400/80 hover:border-emerald-600 rounded-xl p-5 text-center cursor-pointer transition-all bg-emerald-50/20 hover:bg-emerald-50/40"
                >
                  <Paperclip className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">
                    انقر هنا أو اسحب الملف لإرفاق منشور وزاري، رزنامة، أو وثيقة رسمية مع الإعلان
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    يدعم ملفات PDF، Word (.docx)، والصور (سيتمكن الأساتذة والتلاميذ من تحميلها أو معاينتها فورياً)
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingAnn}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingAnn ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ نشر الإعلان...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>نشر الإعلان فورياً</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Administrative Document Upload */}
      {activeTab === 'upload-doc' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileUp className="w-6 h-6 text-emerald-700" />
              <span>رفع ونشر وثيقة إدارية أو منشور وزاري</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              رفع الرزنامات، القوانين الداخلية، أو الاستمارات بصيغة PDF أو Word ليتمكن الأساتذة والتلاميذ من تحميلها.
            </p>
          </div>

          {docSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{docSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUploadAdminDoc} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان الوثيقة الإدارية: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="مثال: القانون الداخلي للمؤسسة ورزنامة العطل المدرسية"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع الوثيقة:
                </label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as DocType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white"
                >
                  <option value="circular">منشور وزاري / إداري</option>
                  <option value="admin_note">مذكرة مصلحة داخلية</option>
                  <option value="test">جدول امتحان موحد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  صيغة الملف:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocFileFormat('pdf')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      docFileFormat === 'pdf'
                        ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-400/20'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>ملف PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocFileFormat('docx')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      docFileFormat === 'docx'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-400/20'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span>Word .docx</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Target Audience for Administrative Document */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الفئة المستهدفة بالوثيقة الإدارية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'كافة أسرة المؤسسة', desc: 'الأساتذة والتلاميذ معاً' },
                  { id: 'teachers', label: 'السادة الأساتذة فقط', desc: 'تعليمات ومذكرات مصلحة' },
                  { id: 'students', label: 'كافة التلاميذ فقط', desc: 'توجيهات واستمارات' },
                  { id: 'specific_class', label: 'أقسام محددة', desc: 'تحديد قسم أو أكثر' },
                ].map(item => {
                  const isSelected = docAudience === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDocAudience(item.id as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>

              {docAudience === 'specific_class' && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">حدد الأقسام المعنية بالوثيقة:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SCHOOL_CLASSES.map(cls => {
                      const isChecked = docSelectedClasses.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              if (docSelectedClasses.length > 1) {
                                setDocSelectedClasses(docSelectedClasses.filter(c => c !== cls.id));
                              }
                            } else {
                              setDocSelectedClasses([...docSelectedClasses, cls.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                            isChecked
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {cls.name.split('(')[0].trim()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                إرفاق الملف:
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  uploadedFile
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50'
                }`}
              >
                {uploadedFile ? (
                  <div className="flex items-center justify-between max-w-sm mx-auto">
                    <div className="flex items-center gap-2">
                      <FileText className="w-6 h-6 text-emerald-600" />
                      <div className="text-right">
                        <p className="font-bold text-sm text-slate-900 truncate max-w-[180px]">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">{uploadedFile.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-emerald-700 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      انقر لتحديد ملف الوثيقة الإدارية من جهازك
                    </p>
                    <p className="text-xs text-slate-500">يدعم صيغ PDF و Word</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                وصف وملاحظات الوثيقة:
              </label>
              <textarea
                rows={3}
                value={docDescription}
                onChange={e => setDocDescription(e.target.value)}
                placeholder="تعليمات خاصة بالمنشور، تواريخ العمل به..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ الرفع والنشر...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>رفع ونشر الوثيقة الإدارية للجميع</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab: All Documents in School */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                بنك الوثائق المدرسية والبيداغوجية والإدارية ({documents.length})
              </h2>
              <p className="text-xs text-slate-500">
                يمكن للمدير الإشراف، المتابعة، التحميل، وحذف أي وثيقة مخالفة.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('upload-doc')}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>رفع وثيقة إدارية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                currentUser={currentUser}
                onPreview={d => setPreviewDoc(d)}
                onDelete={id => {
                  if (window.confirm('هل تريد حذف هذه الوثيقة من المنصة؟')) {
                    deleteDocument(id);
                    onRefreshData();
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Staff Accounts & Passwords Manager */}
      {activeTab === 'staff-accounts' && (
        <StaffAccountsManager />
      )}

      {/* Tab: Roster & Directory */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Quick link to Staff Passwords Manager */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  لوحة إدارة أرقام التعريف المهنية وكلمات سر الأساتذة (42 موظفاً)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  يمكنك كمدير للمؤسسة الاطلاع على كلمات سر كافة الأساتذة (إظهار/إخفاء)، إعادة ضبطها، ونسخ بطاقات الدخول الرسمية.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('staff-accounts')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all shrink-0"
            >
              <span>فتح لوحة كلمات السر والتحكم</span>
              <KeyRound className="w-4 h-4" />
            </button>
          </div>

          {/* Staff Roster Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                  <span>قائمة موظفي وأساتذة المؤسسة المعتمدين (42 موظفاً)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تضم هيئة التدريس، إدارة المؤسسة، المصالح الاقتصادية، مستشارية التوجيه، سلك الإشراف والعمال المهنيين.
                </p>
                <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>الأساتذة المتصلون الآن: {onlineTeacherRecords.length}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>التلاميذ المتصلون الآن: {onlineStudentRecords.length}</span>
                  </span>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setStaffCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    staffCategoryFilter === 'all'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  الكل (42)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffCategoryFilter('teachers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    staffCategoryFilter === 'teachers'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  الأساتذة (22)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffCategoryFilter('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    staffCategoryFilter === 'admin'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  الإدارة والتوجيه والمقتصدية (7)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffCategoryFilter('supervisors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    staffCategoryFilter === 'supervisors'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  مشرفو التربية (3)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffCategoryFilter('workers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    staffCategoryFilter === 'workers'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  العمال والوقاية (10)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getAllUsers()
                .filter(u => u.role !== 'student')
                .filter(u => {
                  if (staffCategoryFilter === 'teachers') return u.role === 'teacher';
                  if (staffCategoryFilter === 'admin') {
                    return (
                      u.role === 'director' ||
                      u.role === 'censor' ||
                      ['مقتصد', 'مقتصدة', 'مستشار', 'مستشارة', 'عون إدارة', 'عون حفظ البيانات', 'كاتب', 'كاتبة'].some(
                        k => u.title?.includes(k)
                      )
                    );
                  }
                  if (staffCategoryFilter === 'supervisors') {
                    return Boolean(u.title?.includes('مشرف'));
                  }
                  if (staffCategoryFilter === 'workers') {
                    return Boolean(u.title?.includes('عامل') || u.title?.includes('وقاية'));
                  }
                  return true;
                })
                .map(staff => {
                  const staffDocs = documents.filter(d => d.authorId === staff.id);
                  const staffPresence = presenceById.get(staff.identifier.trim().toLowerCase());
                  const staffOnline = isUserConnected(staff.identifier, staffPresence, presenceNowTs);
                  const isSupervisor = staff.title?.includes('مشرف');
                  const isAdmin =
                    staff.role === 'director' ||
                    staff.role === 'censor' ||
                    ['مقتصد', 'مستشار', 'إدارة', 'بيانات', 'كاتب'].some(k => staff.title?.includes(k));
                  const isWorker = staff.title?.includes('عامل') || staff.title?.includes('وقاية');

                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-2xl border transition-all space-y-2 ${
                        staffOnline
                          ? 'border-emerald-300 bg-emerald-50/40 hover:bg-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {staffOnline ? (
                            <span className="relative flex h-2.5 w-2.5 shrink-0" title="متصل الآن">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                            </span>
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" title="غير متصل" />
                          )}
                          <span className="font-bold text-slate-900 text-sm truncate">{staff.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {staffOnline && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              متصل
                            </span>
                          )}
                          <span
                            className="text-[11px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold tracking-wider"
                            dir="ltr"
                          >
                            {staff.identifier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                            staff.role === 'director'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : staff.role === 'censor'
                              ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                              : staff.title?.includes('مقتصد')
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : staff.title?.includes('مستشار')
                              ? 'bg-purple-100 text-purple-950 border-purple-300'
                              : isSupervisor
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : isAdmin
                              ? 'bg-teal-100 text-teal-950 border-teal-300'
                              : isWorker
                              ? 'bg-amber-50 text-amber-950 border-amber-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {staff.title || 'موظف بالمؤسسة'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>
                          {staff.role === 'teacher'
                            ? staff.assignedClasses
                              ? `الأقسام: ${staff.assignedClasses.join('، ')}`
                              : 'هيئة التدريس'
                            : isSupervisor
                            ? 'مصلحة الإشراف والانضباط'
                            : isAdmin
                            ? 'إدارة المؤسسة والمصالح'
                            : 'المصالح العامة والخدمات'}
                        </span>
                        {staffDocs.length > 0 ? (
                          <span className="font-bold text-emerald-700">{staffDocs.length} وثائق</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Registered Students from School Lists */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-700" />
                  <span>قوائم التلاميذ ورموز تفعيلهم المعتمدة ({registeredStudents.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  لكل تلميذ رمز تفعيل سري مكون من 6 أرقام للدخول إلى فضائه. يمكنك طباعة القائمة كاملة أو تصديرها من تبويب "رموز تفعيل التلاميذ".
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="بحث بالاسم، رمز التفعيل، أو الرقم..."
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setActiveTab('student-codes')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                  <span>جدول الرموز والطباعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة تلميذ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map(student => {
                const studentPresence = presenceById.get(student.identifier.trim().toLowerCase());
                const studentOnline = isUserConnected(student.identifier, studentPresence, presenceNowTs);
                return (
                  <div
                    key={student.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 text-xs ${
                      studentOnline
                        ? 'border-emerald-300 bg-emerald-50/50 hover:bg-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-400'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {studentOnline ? (
                        <span className="relative flex h-2.5 w-2.5 shrink-0" title="متصل الآن">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                        </span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" title="غير متصل" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 block truncate">{student.name}</span>
                          {studentOnline && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                              متصل
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-800 font-semibold block">{student.className}</span>
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <span className="text-[9px] text-emerald-700 font-bold block mb-0.5">رمز التفعيل</span>
                      <span
                        className="font-mono bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg text-emerald-950 font-black tracking-wider block"
                        dir="ltr"
                      >
                        {student.activationCode || '------'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Classes & Students Counting Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <span>تعداد أفواج وأقسام متوسطة الشهيد بن نعمة</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SCHOOL_CLASSES.map(cls => (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-center"
                >
                  <span className="font-bold text-slate-900 text-sm block">{cls.name}</span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {cls.studentCount} تلميذ وتلميذة
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onStudentAdded={() => {
          setStudentRefreshSignal(s => s + 1);
          onRefreshData();
        }}
      />

      {/* Tab: Live Online Students & Teachers */}
      {activeTab === 'online-users' && (() => {
        const q = presenceSearch.trim().toLowerCase();

        const studentEntries = (
          presenceViewMode === 'online'
            ? onlineStudentRecords
            : registeredStudents.map(u => ({
                user: u,
                presence: presenceById.get(u.identifier.trim().toLowerCase()) || null,
              }))
        )
          .filter(item => {
            if (presenceClassFilter !== 'ALL' && item.user.classId !== presenceClassFilter) return false;
            if (!q) return true;
            return (
              item.user.name.toLowerCase().includes(q) ||
              (item.user.className || '').toLowerCase().includes(q)
            );
          })
          .sort((a, b) => {
            const aOn = isUserConnected(a.user.identifier, a.presence, presenceNowTs) ? 1 : 0;
            const bOn = isUserConnected(b.user.identifier, b.presence, presenceNowTs) ? 1 : 0;
            if (aOn !== bOn) return bOn - aOn;
            return (b.presence?.lastSeen || 0) - (a.presence?.lastSeen || 0);
          });

        const teacherEntries = (
          presenceViewMode === 'online'
            ? onlineTeacherRecords
            : allTeachers.map(u => ({
                user: u,
                presence: presenceById.get(u.identifier.trim().toLowerCase()) || null,
              }))
        )
          .filter(item => {
            if (!q) return true;
            return (
              item.user.name.toLowerCase().includes(q) ||
              (item.user.title || '').toLowerCase().includes(q) ||
              (item.user.assignedClasses || []).some(c => c.toLowerCase().includes(q))
            );
          })
          .sort((a, b) => {
            const aOn = isUserConnected(a.user.identifier, a.presence, presenceNowTs) ? 1 : 0;
            const bOn = isUserConnected(b.user.identifier, b.presence, presenceNowTs) ? 1 : 0;
            if (aOn !== bOn) return bOn - aOn;
            return (b.presence?.lastSeen || 0) - (a.presence?.lastSeen || 0);
          });

        return (
          <div className="space-y-6">
            {/* Live Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 p-5 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm relative">
                    <GraduationCap className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">التلاميذ المتصلون الآن</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>متصل</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      من أصل {registeredStudents.length} تلميذ وتلميذة مسجلين في المنصة
                    </p>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-700 tabular-nums">
                    {onlineStudentRecords.length}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-500">تلميذ متصل</span>
                </div>
              </div>

              <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 p-5 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-sm relative">
                    <BookOpen className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">الأساتذة المتصلون الآن</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>متصل</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      من أصل {allTeachers.length} أستاذ وأستاذة في هيئة التدريس
                    </p>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-3xl sm:text-4xl font-black text-teal-700 tabular-nums">
                    {onlineTeacherRecords.length}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-500">أستاذ متصل</span>
                </div>
              </div>
            </div>

            {/* Filter & View Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPresenceViewMode('online')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    presenceViewMode === 'online'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>المتصلون الآن فقط ({onlineStudentRecords.length + onlineTeacherRecords.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPresenceViewMode('all')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    presenceViewMode === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>عرض الكل (بمؤشر أخضر للمتصل / رمادي لغير المتصل)</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={presenceSearch}
                    onChange={e => setPresenceSearch(e.target.value)}
                    placeholder="بحث بالاسم أو القسم أو المادة..."
                    className="pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-emerald-600 w-56 sm:w-64"
                  />
                </div>

                <select
                  value={presenceClassFilter}
                  onChange={e => setPresenceClassFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-none focus:border-emerald-600"
                >
                  <option value="ALL">جميع الأقسام ({SCHOOL_CLASSES.length})</option>
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dual Live Panels: Online Students & Online Teachers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Online Students List */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    </span>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">
                      قائمة التلاميذ المتصلين
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                    {onlineStudentRecords.length} متصل
                  </span>
                </div>

                {studentEntries.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">
                      {presenceViewMode === 'online'
                        ? 'لا يوجد تلاميذ متصلون بالمنصة في هذه اللحظة'
                        : 'لا توجد نتائج مطابقة للبحث'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      بمجرد دخول أي تلميذ برمز التفعيل سيظهر اسمه وقسمه هنا مع ضوء أخضر فوري.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[540px] overflow-y-auto pl-1">
                    {studentEntries.map(({ user: stu, presence }) => {
                      const online = isUserConnected(stu.identifier, presence, presenceNowTs);
                      return (
                        <div
                          key={stu.identifier}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            online
                              ? 'border-emerald-200 bg-emerald-50/60'
                              : 'border-slate-200 bg-slate-50/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {online ? (
                              <span className="relative flex h-3 w-3 shrink-0" title="متصل الآن">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                              </span>
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" title="غير متصل" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-sm block truncate">
                                {stu.name}
                              </span>
                              <span className="text-xs font-semibold text-emerald-800 block">
                                {stu.className || 'تلميذ بالمؤسسة'}
                              </span>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            {online ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">
                                  متصل الآن
                                </span>
                                <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                                  {formatPresenceAgo(presence?.lastSeen)}
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                                غير متصل
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Online Teachers List */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    </span>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">
                      قائمة الأساتذة المتصلين
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-black">
                    {onlineTeacherRecords.length} متصل
                  </span>
                </div>

                {teacherEntries.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">
                      {presenceViewMode === 'online'
                        ? 'لا يوجد أساتذة متصلون بالمنصة في هذه اللحظة'
                        : 'لا توجد نتائج مطابقة للبحث'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      عند تسجيل دخول أي أستاذ إلى فضائه سيظهر اسمه ومادته هنا مع ضوء أخضر فوري.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[540px] overflow-y-auto pl-1">
                    {teacherEntries.map(({ user: teacher, presence }) => {
                      const online = isUserConnected(teacher.identifier, presence, presenceNowTs);
                      return (
                        <div
                          key={teacher.identifier}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            online
                              ? 'border-emerald-200 bg-emerald-50/60'
                              : 'border-slate-200 bg-slate-50/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {online ? (
                              <span className="relative flex h-3 w-3 shrink-0" title="متصل الآن">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                              </span>
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" title="غير متصل" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-sm block truncate">
                                {teacher.name}
                              </span>
                              <span className="text-xs font-semibold text-teal-800 block truncate">
                                {teacher.title || 'أستاذ(ة) التعليم المتوسط'}
                              </span>
                              {teacher.assignedClasses && teacher.assignedClasses.length > 0 && (
                                <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                                  الأقسام: {teacher.assignedClasses.join('، ')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            {online ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">
                                  متصل الآن
                                </span>
                                <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                                  {formatPresenceAgo(presence?.lastSeen)}
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                                غير متصل
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab: Student Activation Codes Directory */}
      {activeTab === 'student-codes' && (
        <StudentActivationCodesManager
          onOpenAddStudent={() => setShowAddStudentModal(true)}
          refreshSignal={studentRefreshSignal}
        />
      )}

      {/* Tab: Student Chat Supervision */}
      {activeTab === 'chat-supervision' && (
        <StudentChatSupervisionPanel currentUser={currentUser} />
      )}

      {/* Preview Modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Database Diagnostics & Storage Debug Modal */}
      <DatabaseDebugView
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        onRefreshData={onRefreshData}
      />
    </div>
  );
};
