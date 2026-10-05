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
  Megaphone,
  Plus,
  Send,
  Shield,
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
  registerNewUser,
  saveAnnouncement,
  saveDocument,
  syncWithServer,
} from '../../services/storageService';
import {
  AnnouncementPriority,
  AnnouncementTarget,
  DocType,
  FileFormat,
  ParentSummon,
  SchoolAnnouncement,
  SchoolDocument,
  SubjectId,
  UserProfile,
} from '../../types';
import { AnnouncementCard } from '../common/AnnouncementCard';
import { DocumentCard } from '../common/DocumentCard';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal';
import { DatabaseDebugView } from './DatabaseDebugView';

interface DirectorViewProps {
  currentUser: UserProfile;
  documents: SchoolDocument[];
  announcements: SchoolAnnouncement[];
  summons: ParentSummon[];
  onRefreshData: () => void;
}

export const DirectorView: React.FC<DirectorViewProps> = ({
  currentUser,
  documents,
  announcements,
  summons,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'new-announcement' | 'documents' | 'upload-doc' | 'roster'>('announcements');
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);

  // New Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTarget, setAnnTarget] = useState<AnnouncementTarget>('all');
  const [annPriority, setAnnPriority] = useState<AnnouncementPriority>('important');
  const [annBadge, setAnnBadge] = useState('منشور المدير');
  const [annSuccess, setAnnSuccess] = useState<string | null>(null);

  // Administrative Document Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docFileFormat, setDocFileFormat] = useState<FileFormat>('pdf');
  const [docType, setDocType] = useState<DocType>('circular');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; dataUrl?: string } | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Student Roster States
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('4AM-1');
  const [studentAddedSuccess, setStudentAddedSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target Filter for Announcements List
  const [filterTarget, setFilterTarget] = useState<AnnouncementTarget | 'ALL'>('ALL');

  const filteredAnnouncements = announcements.filter(a => {
    if (filterTarget === 'ALL') return true;
    return a.target === filterTarget;
  });

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    saveAnnouncement({
      title: annTitle.trim(),
      content: annContent.trim(),
      target: annTarget,
      priority: annPriority,
      authorName: `${currentUser.name} (مدير المتوسطة)`,
      authorRole: 'director',
      badge: annBadge.trim() || 'بلاغ الإدارة',
    });

    onRefreshData();
    setAnnSuccess('تم نشر الإعلان بنجاح إلى الفئة المحددة!');

    setAnnTitle('');
    setAnnContent('');

    setTimeout(() => {
      setAnnSuccess(null);
      setActiveTab('announcements');
    }, 1800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setDocFileFormat('pdf');
    else if (ext === 'docx' || ext === 'doc') setDocFileFormat('docx');
    else if (ext === 'xlsx' || ext === 'xls') setDocFileFormat('xlsx');

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
  };

  const handleUploadAdminDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    setIsUploading(true);

    const fileName =
      uploadedFile?.name ||
      `${docTitle.replace(/\s+/g, '_')}.${docFileFormat === 'docx' ? 'docx' : docFileFormat}`;
    const fileSize = uploadedFile?.size || '1.5 MB';

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
      targetClasses: ['ALL'],
      targetAudience: 'all_students',
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

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim()) return;

    const selectedCls = SCHOOL_CLASSES.find(c => c.id === newStudentClass);
    const newStudent: UserProfile = {
      id: 'student-' + newStudentId.trim(),
      identifier: newStudentId.trim(),
      name: newStudentName.trim(),
      role: 'student',
      classId: newStudentClass,
      className: selectedCls?.name || '4 متوسط 1',
      title: 'تلميذ مقيد بقوائم المؤسسة',
    };

    registerNewUser(newStudent);
    setStudentAddedSuccess(`تمت إضافة التلميذ(ة) "${newStudentName}" بالرقم المدرسي (${newStudentId}) بنجاح!`);
    setNewStudentId('');
    setNewStudentName('');
    onRefreshData();

    setTimeout(() => {
      setStudentAddedSuccess(null);
      setShowAddStudentModal(false);
    }, 1600);
  };

  const totalDownloads = documents.reduce((acc, d) => acc + (d.downloadCount || 0), 0);
  const totalStudentsApprox = SCHOOL_CLASSES.reduce((acc, c) => acc + c.studentCount, 0);

  const registeredStudents = getAllUsers().filter(u => u.role === 'student');
  const filteredStudents = registeredStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.identifier.toLowerCase().includes(q) || (s.className && s.className.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Director Executive Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
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

          {/* Key School Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>لوحة الإعلانات الرسمية ({announcements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new-announcement')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'new-announcement'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>نشر إعلان جديد (للتلاميذ / الأساتذة / الموظفين)</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'documents'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>بنك الوثائق والمنشورات ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload-doc')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'upload-doc'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>تحميل ونشر وثيقة إدارية</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'roster'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>دليل الطاقم التربوي والأقسام</span>
          </button>
        </div>

        {/* Diagnostic Storage Debug Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDebugModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs active:scale-95 cursor-pointer"
            title="فحص محتويات localStorage والبيانات الخام وتشخيص مشاكل التخزين"
          >
            <Database className="w-4 h-4 text-amber-700" />
            <span>فحص قاعدة البيانات (Debug View)</span>
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
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إعلان جديد</span>
            </button>
          </div>

          <div className="space-y-4">
            {filteredAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                currentUser={currentUser}
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
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{annSuccess}</span>
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

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>نشر الإعلان فورياً</span>
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

      {/* Tab: Roster & Directory */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Teachers Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              <span>قائمة الأساتذة المسجلين بالمنصة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MOCK_USERS.filter(u => u.role === 'teacher').map(teacher => {
                const teacherDocs = documents.filter(d => d.authorId === teacher.id);
                return (
                  <div
                    key={teacher.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{teacher.name}</span>
                      <span className="text-[11px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {teacher.identifier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{teacher.title}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>الأقسام: {teacher.assignedClasses?.join('، ')}</span>
                      <span className="font-bold text-emerald-700">{teacherDocs.length} وثائق</span>
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
                  <span>قوائم التلاميذ وأرقامهم المدرسية المعتمدة ({registeredStudents.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أرقام التعريف المدرسية المسجلة من واقع ملفات المؤسسة (يدخل بها التلميذ مباشرة).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="بحث برقم التعريف أو الاسم..."
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة رقم تلميذ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-400 transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{student.name}</span>
                    <span className="text-[11px] text-emerald-800 font-semibold block">{student.className}</span>
                  </div>
                  <span className="font-mono bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-700 font-bold" dir="ltr">
                    {student.identifier}
                  </span>
                </div>
              ))}
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
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">إضافة تلميذ جديد للقائمة المدرسية</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentAddedSuccess && (
              <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 font-bold text-xs text-center">
                {studentAddedSuccess}
              </div>
            )}

            <form onSubmit={handleAddStudent} className="p-6 space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم التعريف المدرسي (من الملف): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1097448010036809"
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-sm font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم ولقب التلميذ(ة): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أمين حدادي"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  القسم والفوج: <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStudentClass}
                  onChange={e => setNewStudentClass(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-sm bg-white"
                >
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                >
                  إضافة التلميذ وتفعيل دخوله فوراً
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
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
