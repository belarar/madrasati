import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Megaphone,
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { MOCK_USERS, SCHOOL_CLASSES, SCHOOL_NAME } from '../../data/mockData';
import {
  deleteAnnouncement,
  openWhatsAppSummon,
  saveAnnouncement,
  saveSummon,
  updateSummonStatus,
} from '../../services/storageService';
import {
  AnnouncementPriority,
  AnnouncementTarget,
  FileFormat,
  ParentSummon,
  SchoolAnnouncement,
  SchoolDocument,
  SummonReason,
  UserProfile,
} from '../../types';
import { AnnouncementCard } from '../common/AnnouncementCard';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal';
import { SummonModal } from '../common/SummonModal';
import { processAndCompressFile } from '../../utils/fileCompressor';

interface CensorViewProps {
  currentUser: UserProfile;
  announcements: SchoolAnnouncement[];
  summons: ParentSummon[];
  onRefreshData: () => void;
}

export const CensorView: React.FC<CensorViewProps> = ({
  currentUser,
  announcements,
  summons,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'summons' | 'new-summon' | 'announcements' | 'new-announcement'>('summons');
  const [selectedSummonModal, setSelectedSummonModal] = useState<ParentSummon | null>(null);

  // New Summon Form
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('4 متوسط 1');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [reason, setReason] = useState<SummonReason>('absence');
  const [reasonDetails, setReasonDetails] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [appointmentTime, setAppointmentTime] = useState('10:00 صباحاً');
  const [summonSuccess, setSummonSuccess] = useState<string | null>(null);

  // Preview Document Modal State
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);

  // New Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTarget, setAnnTarget] = useState<AnnouncementTarget>('students');
  const [annPriority, setAnnPriority] = useState<AnnouncementPriority>('important');
  const [annBadge, setAnnBadge] = useState('إعلان الناظر');
  const [annSuccess, setAnnSuccess] = useState<string | null>(null);
  const [annUploadedFile, setAnnUploadedFile] = useState<{
    name: string;
    size: string;
    format: FileFormat;
    dataUrl?: string;
  } | null>(null);
  const annFileInputRef = useRef<HTMLInputElement>(null);

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
        authorId: 'censor',
        authorName: ann.authorName,
        authorRole: 'censor',
        targetClasses: ['ALL'],
        uploadDate: ann.createdAt,
        downloadCount: 0,
      });
    }
  };

  // Search & Filters for summons
  const [summonSearch, setSummonSearch] = useState('');

  // Pre-fill student info if user selects from known students
  const handleSelectPredefinedStudent = (std: UserProfile) => {
    setStudentId(std.identifier);
    setStudentName(std.name);
    setStudentClass(std.className || '4 متوسط 1');
    setGuardianName(`ولي أمر التلميذ(ة) ${std.name}`);
    setGuardianPhone(std.phone || '0550123456');
  };

  const handleCreateSummon = (e: React.FormEvent, sendWhatsAppImmediately: boolean = false) => {
    e.preventDefault();
    if (!studentName.trim() || !guardianPhone.trim()) return;

    const newSummon = saveSummon({
      studentId: studentId.trim() || 'STD-' + Date.now().toString().slice(-4),
      studentName: studentName.trim(),
      studentClass,
      guardianName: guardianName.trim() || `ولي أمر ${studentName}`,
      guardianPhone: guardianPhone.trim(),
      reason,
      reasonDetails: reasonDetails.trim() || undefined,
      appointmentDate,
      appointmentTime,
      issuedBy: currentUser.title || 'ناظر المتوسطة',
      notes: 'تم تسجيل الاستدعاء في سجل الناظر الرقمي.',
    });

    onRefreshData();
    setSummonSuccess(`تم تسجيل استدعاء ولي أمر التلميذ "${studentName}" بنجاح!`);

    if (sendWhatsAppImmediately) {
      setTimeout(() => {
        openWhatsAppSummon(newSummon);
      }, 500);
    }

    // Reset Form
    setStudentName('');
    setStudentId('');
    setGuardianPhone('');
    setReasonDetails('');

    setTimeout(() => {
      setSummonSuccess(null);
      setActiveTab('summons');
    }, 2000);
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    saveAnnouncement({
      title: annTitle.trim(),
      content: annContent.trim(),
      target: annTarget,
      priority: annPriority,
      authorName: `${currentUser.name} (ناظر المتوسطة)`,
      authorRole: 'censor',
      badge: annBadge.trim() || 'توجيهات الناظر',
      fileName: annUploadedFile?.name,
      fileSize: annUploadedFile?.size,
      fileFormat: annUploadedFile?.format,
      fileDataUrl: annUploadedFile?.dataUrl,
    });

    onRefreshData();
    setAnnSuccess('تم نشر الإعلان مع المرفق بنجاح وحفظه في قاعدة البيانات!');

    setAnnTitle('');
    setAnnContent('');
    setAnnUploadedFile(null);
    if (annFileInputRef.current) annFileInputRef.current.value = '';

    setTimeout(() => {
      setAnnSuccess(null);
      setActiveTab('announcements');
    }, 1800);
  };

  const filteredSummons = summons.filter(s => {
    if (!summonSearch.trim()) return true;
    const q = summonSearch.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentClass.toLowerCase().includes(q) ||
      s.guardianPhone.includes(q) ||
      s.guardianName.toLowerCase().includes(q)
    );
  });

  const censorAnnouncements = announcements.filter(
    a => a.authorRole === 'censor' || a.target === 'students'
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-white/15">
              <Shield className="w-4 h-4" />
              <span>مكتب ناظر المؤسسة ومستشارية التربية</span>
              <span className="opacity-60">•</span>
              <span>المعرف: {currentUser.identifier}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              فضاء الناظر - {currentUser.name}
            </h1>

            <p className="text-emerald-100 text-sm max-w-xl">
              إدارة الانضباط المدرسي، إرسال إعلانات موجهة للتلاميذ، وتوجيه استدعاءات رسمية لأولياء الأمور مباشرة عبر تطبيق واتساب وطباعة الوصولات.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">استدعاءات الأولياء</span>
              <span className="text-2xl font-black text-white">{summons.length}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">إعلانات التلاميذ</span>
              <span className="text-2xl font-black text-emerald-300">{censorAnnouncements.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('summons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'summons'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-300" />
            <span>سجل الاستدعاءات وواتساب ({summons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new-summon')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'new-summon'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء استدعاء جديد لولي أمر</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>إعلانات التلاميذ المنشورة ({censorAnnouncements.length})</span>
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
            <span>نشر إعلان جديد للتلاميذ</span>
          </button>
        </div>
      </div>

      {/* Tab: Summons List & WhatsApp Actions */}
      {activeTab === 'summons' && (
        <div className="space-y-4">
          {/* Top Bar with Search & Action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={summonSearch}
                onChange={e => setSummonSearch(e.target.value)}
                placeholder="ابحث باسم التلميذ، القسم، أو رقم هاتف الولي..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            <button
              onClick={() => setActiveTab('new-summon')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>تحرير استدعاء جديد</span>
            </button>
          </div>

          {filteredSummons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">لا توجد استدعاءات مطابقة للبحث</p>
              <button
                onClick={() => setActiveTab('new-summon')}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
              >
                إنشاء أول استدعاء الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSummons.map(summon => (
                <div
                  key={summon.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        {summon.studentName}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-lg text-xs">
                        {summon.studentClass}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          summon.status === 'attended'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {summon.status === 'attended' ? 'حضر الولي' : 'تم الإرسال (قيد الانتظار)'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600">
                      <strong>سبب الاستدعاء:</strong> {summon.reasonDetails || summon.reason}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          الموعد: <strong>{summon.appointmentDate}</strong> الساعة{' '}
                          <strong>{summon.appointmentTime}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-mono" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{summon.guardianPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Direct WhatsApp Button */}
                    <button
                      onClick={() => openWhatsAppSummon(summon)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-95"
                      title="إرسال رسالة رسمية للولي عبر واتساب"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>إرسال واتساب</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </button>

                    {/* View & Print Slip */}
                    <button
                      onClick={() => setSelectedSummonModal(summon)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors"
                      title="عرض وطباعة وصل الاستدعاء"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>معاينة وطباعة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Create New Summon */}
      {activeTab === 'new-summon' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-emerald-700" />
              <span>تحرير استدعاء رسمي لولي أمر تلميذ (مع إرسال عبر واتساب)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              يتم إنشاء استدعاء رسمي مع خيار إرساله فورياً إلى رقم هاتف الولي عبر واتساب وتجهيز وصل قابل للطباعة.
            </p>
          </div>

          {/* Quick pick from known students */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              اختيار سريع من قائمة التلاميذ المسجلين:
            </span>
            <div className="flex flex-wrap gap-2">
              {MOCK_USERS.filter(u => u.role === 'student').map(std => (
                <button
                  type="button"
                  key={std.id}
                  onClick={() => handleSelectPredefinedStudent(std)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-semibold text-slate-800 transition-colors"
                >
                  {std.name} ({std.className})
                </button>
              ))}
            </div>
          </div>

          {summonSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{summonSuccess}</span>
            </div>
          )}

          <form onSubmit={e => handleCreateSummon(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم ولقب التلميذ(ة): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="مثال: ياسين بن علي"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  القسم والفوج: <span className="text-red-500">*</span>
                </label>
                <select
                  value={studentClass}
                  onChange={e => setStudentClass(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white"
                >
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم ولي الأمر أو الوصي:
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="مثال: السيد رابح بن علي"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم هاتف الولي (واتساب): <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={guardianPhone}
                  onChange={e => setGuardianPhone(e.target.value)}
                  placeholder="مثال: 0550123456"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  سبب الاستدعاء: <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value as SummonReason)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white"
                >
                  <option value="absence">غيابات وتأخرات متكررة</option>
                  <option value="discipline">سلوك وانضباط مدرسي</option>
                  <option value="grades">تراجع النتائج والمستوى</option>
                  <option value="admin">أمر إداري عاجل</option>
                  <option value="report_card">استلام كشف النقاط</option>
                  <option value="other">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تاريخ الموعد: <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  توقيت الحضور: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={appointmentTime}
                  onChange={e => setAppointmentTime(e.target.value)}
                  placeholder="مثال: 10:00 صباحاً"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تفاصيل إضافية أو ملاحظات الاستدعاء:
              </label>
              <textarea
                rows={3}
                value={reasonDetails}
                onChange={e => setReasonDetails(e.target.value)}
                placeholder="تفاصيل الحصص المتغيب فيها، أو ملاحظات مجلس التأديب..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={e => handleCreateSummon(e, true)}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>حفظ وإرسال عبر واتساب فوراً</span>
              </button>

              <button
                type="submit"
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>حفظ في السجل فقط</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Student Announcements List */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <span>إعلانات التلاميذ الصادرة ({censorAnnouncements.length})</span>
            </h2>

            <button
              onClick={() => setActiveTab('new-announcement')}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>نشر إعلان جديد</span>
            </button>
          </div>

          <div className="space-y-4">
            {censorAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                currentUser={currentUser}
                onPreviewAttachment={handlePreviewAnnAttachment}
                onDelete={id => {
                  deleteAnnouncement(id);
                  onRefreshData();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab: New Announcement Form */}
      {activeTab === 'new-announcement' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-emerald-700" />
              <span>نشر إعلان رسمي من ناظر المتوسطة</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              حدد الفئة المستهدفة وأرفق وثيقة أو منشوراً (PDF أو Word أو صورة) ليتمكن الجميع من معاينتها وتحميلها.
            </p>
          </div>

          {annSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{annSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
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
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان الإعلان: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                placeholder="مثال: انطلاق حصص الدعم البيداغوجي لمواد شهادة BEM"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-medium"
              />
            </div>

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
                  placeholder="مثال: بيداغوجيا ودعم / توجيهات"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نص الإعلان والتفاصيل: <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={annContent}
                onChange={e => setAnnContent(e.target.value)}
                placeholder="اكتب هنا نص الإعلان، التوقيت، القاعات، أو التعليمات الموجهة للتلاميذ..."
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
                    className="text-xs text-red-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
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
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                    تم إرفاق الملف ✓
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => annFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-5 text-center cursor-pointer transition-all bg-white hover:bg-emerald-50/20"
                >
                  <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">
                    انقر هنا لإرفاق رزنامة، جدول استدراك، أو وثيقة رسمية مع الإعلان
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    يدعم ملفات PDF، Word (.docx)، والصور (سيتمكن الأساتذة والتلاميذ من تحميلها أو معاينتها فورياً)
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>نشر الإعلان مع المرفق فورياً</span>
            </button>
          </form>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Modal for official print slip & WhatsApp */}
      <SummonModal
        summon={selectedSummonModal}
        currentUser={currentUser}
        onClose={() => setSelectedSummonModal(null)}
        onStatusUpdated={onRefreshData}
      />
    </div>
  );
};
