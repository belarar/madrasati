import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  Layers,
  Plus,
  Send,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES, SUBJECTS } from '../../data/mockData';
import { deleteDocument, saveDocument, syncWithServer } from '../../services/storageService';
import {
  DocType,
  EducationLevel,
  FileFormat,
  SchoolAnnouncement,
  SchoolDocument,
  SubjectId,
  UserProfile,
} from '../../types';
import { processAndCompressFile } from '../../utils/fileCompressor';
import { AnnouncementCard } from '../common/AnnouncementCard';
import { DocumentCard } from '../common/DocumentCard';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal';

interface TeacherViewProps {
  currentUser: UserProfile;
  documents: SchoolDocument[];
  announcements: SchoolAnnouncement[];
  onRefreshData: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  currentUser,
  documents,
  announcements,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'my-docs' | 'announcements'>('upload');
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);

  // New Document Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<SubjectId>(currentUser.subjects?.[0] || 'math');
  const [docType, setDocType] = useState<DocType>('lesson');
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');
  const [targetClasses, setTargetClasses] = useState<string[]>(
    currentUser.assignedClasses || ['4AM-1']
  );
  const [selectAllClasses, setSelectAllClasses] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    dataUrl?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter documents created by this teacher
  const myDocs = documents.filter(
    d =>
      d.authorId === currentUser.id ||
      d.authorId === currentUser.identifier ||
      (currentUser.identifier && d.authorId?.includes(currentUser.identifier))
  );
  const totalDownloads = myDocs.reduce((acc, d) => acc + (d.downloadCount || 0), 0);

  // Announcements targeted to teachers or all
  const teacherAnnouncements = announcements.filter(
    a => a.target === 'teachers' || a.target === 'all'
  );

  const handleClassToggle = (classId: string) => {
    if (selectAllClasses) {
      setSelectAllClasses(false);
      setTargetClasses([classId]);
      return;
    }

    if (targetClasses.includes(classId)) {
      if (targetClasses.length > 1) {
        setTargetClasses(targetClasses.filter(c => c !== classId));
      }
    } else {
      setTargetClasses([...targetClasses, classId]);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectAllClasses) {
      setSelectAllClasses(false);
      setTargetClasses(currentUser.assignedClasses || ['4AM-1']);
    } else {
      setSelectAllClasses(true);
      setTargetClasses(SCHOOL_CLASSES.map(c => c.id));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Detect format
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setFileFormat('pdf');
    else if (ext === 'docx' || ext === 'doc') setFileFormat('docx');
    else if (ext === 'xlsx' || ext === 'xls') setFileFormat('xlsx');
    else if (ext === 'pptx' || ext === 'ppt') setFileFormat('pptx');
    else if (file.type.startsWith('image/')) setFileFormat('image');

    try {
      const processed = await processAndCompressFile(file);
      setUploadedFile({
        name: processed.name,
        size: processed.sizeFormatted,
        dataUrl: processed.dataUrl,
      });
    } catch {
      // Fallback
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    const docTargetClasses = selectAllClasses
      ? ['ALL']
      : targetClasses.length > 0
        ? targetClasses
        : ['ALL'];

    const fileName =
      uploadedFile?.name ||
      `${title.replace(/\s+/g, '_')}.${fileFormat === 'docx' ? 'docx' : fileFormat}`;
    const fileSize = uploadedFile?.size || '1.2 MB';

    saveDocument({
      title,
      description:
        description.trim() ||
        'يرجى من جميع تلميذات وتلاميذ الأقسام المعنية تحميل الوثيقة والاطلاع على التعليمات وإنجاز المطلوب بدقة.',
      subject,
      docType,
      fileFormat,
      fileName,
      fileSize,
      fileDataUrl: uploadedFile?.dataUrl,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: 'teacher',
      targetClasses: docTargetClasses,
      targetAudience: selectAllClasses || docTargetClasses.includes('ALL') ? 'all_students' : 'specific_class',
      targetLevel: docTargetClasses.includes('ALL') ? undefined : (docTargetClasses[0]?.split('-')[0] as EducationLevel),
    });

    // Immediate server sync
    syncWithServer();

    setIsSubmitting(false);
    setSuccessMessage(`تم إرسال وثيقة "${title}" بنجاح إلى التلاميذ المعنيين!`);
    onRefreshData();

    // Reset form
    setTitle('');
    setDescription('');
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      setSuccessMessage(null);
      setActiveTab('my-docs');
    }, 1800);
  };

  const handleDelete = (docId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الوثيقة نهائياً؟')) {
      deleteDocument(docId);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher Profile Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-emerald-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-sky-200 border border-white/15">
              <UserCheck className="w-4 h-4" />
              <span>فضاء الأستاذ الرقمي</span>
              <span className="opacity-60">•</span>
              <span>رقم التعريف المهني: {currentUser.identifier}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              أهلاً بك، {currentUser.name}
            </h1>

            <p className="text-sky-100 text-sm max-w-xl">
              {currentUser.title || 'أستاذ التعليم المتوسط'} - يمكنك إرسال الوثائق والدروس وفروض المراجعة (Word, PDF) لقسم معين أو عدة أقسام بضغطة زر.
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-sky-200 block mb-0.5 font-medium">وثائق نشرتها</span>
              <span className="text-2xl font-black text-white">{myDocs.length}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-sky-200 block mb-0.5 font-medium">تحميلات التلاميذ</span>
              <span className="text-2xl font-black text-emerald-300">{totalDownloads}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-sky-200 block mb-0.5 font-medium">أقسامك الموكلة</span>
              <span className="text-2xl font-black text-white">
                {currentUser.assignedClasses?.length || 3}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>إرسال وثيقة جديدة للأقسام</span>
          </button>

          <button
            onClick={() => setActiveTab('my-docs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'my-docs'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>وثائقي المنشورة ({myDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'announcements'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>إعلانات الإدارة والمدير ({teacherAnnouncements.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          المؤسسة: متوسطة الشهيد بن نعمة مصطفى
        </div>
      </div>

      {/* Tab: Upload / Send Document */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <FileUp className="w-6 h-6 text-emerald-700" />
              <span>إرسال وثيقة أو واجب تعليمي إلى التلاميذ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              اختر الأقسام المستهدفة، حدد نوع الملف (PDF أو Word أو غيرها)، وارفق الوثيقة لتصل فورياً إلى هواتف وحواسيب التلاميذ.
            </p>
          </div>

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 text-sm animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان الوثيقة أو الدرس: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: سلسلة تمارين المراجعة في مبرهنة طالس وحساب المثلثات"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none transition-all font-medium"
              />
            </div>

            {/* Subject & DocType Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المادة التعليمية: <span className="text-red-500">*</span>
                </label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value as SubjectId)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none transition-all bg-white"
                >
                  {SUBJECTS.filter(s => s.id !== 'admin').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع الوثيقة البيداغوجية: <span className="text-red-500">*</span>
                </label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as DocType)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none transition-all bg-white"
                >
                  <option value="bem_prep">تحضير شهادة التعليم المتوسط (BEM Prep)</option>
                  <option value="summary">ملخص شامل للدروس</option>
                  <option value="homework">واجب منزلي</option>
                  <option value="test">فرض محروس / نموذج اختبار</option>
                  <option value="lesson">درس أو مطبوعة تعليمية</option>
                  <option value="exercise">سلسلة تمارين مع الحل</option>
                </select>
              </div>
            </div>

            {/* Target Classes Selection (Single or Multiple) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    الأقسام المعنية بالوثيقة: <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    يمكنك اختيار قسم واحد، أو تحديد عدة أقسام معاً لتصل الوثيقة إلى تلاميذهم جميعاً.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllToggle}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    selectAllClasses
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {selectAllClasses ? 'إلغاء تحديد الكل' : 'تحديد جميع الأقسام'}
                </button>
              </div>

              {selectAllClasses ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>📢 الوثيقة ستصل إلى: جميع تلميذات وتلاميذ المؤسسة (كافة الأقسام والمستويات)</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-300 text-xs font-bold text-blue-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    📢 الوثيقة ستصل حصراً إلى الأقسام المحددة ({targetClasses.length} قسم: {targetClasses.join('، ')})
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {SCHOOL_CLASSES.map(cls => {
                  const isChecked = selectAllClasses || targetClasses.includes(cls.id);
                  return (
                    <button
                      type="button"
                      key={cls.id}
                      onClick={() => handleClassToggle(cls.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold text-right transition-all ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-500 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{cls.name}</span>
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Format Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                صيغة الملف المرفق: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: 'pdf',
                    label: 'ملف PDF',
                    icon: <FileText className="w-4 h-4 text-red-600" />,
                    bg: 'hover:border-red-400',
                  },
                  {
                    id: 'docx',
                    label: 'ملف Word (.docx)',
                    icon: <FileCheck className="w-4 h-4 text-blue-600" />,
                    bg: 'hover:border-blue-400',
                  },
                  {
                    id: 'pptx',
                    label: 'عرض PowerPoint',
                    icon: <Layers className="w-4 h-4 text-amber-600" />,
                    bg: 'hover:border-amber-400',
                  },
                  {
                    id: 'xlsx',
                    label: 'جدول Excel',
                    icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
                    bg: 'hover:border-emerald-400',
                  },
                ].map(fmt => {
                  const isSelected = fileFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFileFormat(fmt.id as FileFormat)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                          : `border-slate-200 bg-white text-slate-700 ${fmt.bg}`
                      }`}
                    >
                      {fmt.icon}
                      <span>{fmt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Upload Zone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                إرفاق الوثيقة من الهاتف أو الكمبيوتر:
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  uploadedFile
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {uploadedFile ? (
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        {fileFormat.toUpperCase()}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">
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
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center mx-auto text-emerald-700 shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      انقر لاختيار ملف Word أو PDF من جهازك
                    </p>
                    <p className="text-xs text-slate-500">
                      يدعم صيغ PDF، DOCX، PPTX، أو الصور التعليمية (بحد أقصى 25 ميغابايت)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                توجيهات وملاحظات للتلاميذ:
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب هنا أي ملاحظات، تاريخ تسليم الواجب، أو إرشادات حل التمارين..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ رفع وإرسال الوثيقة...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>إرسال الوثيقة إلى التلاميذ الآن</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab: My Uploaded Documents */}
      {activeTab === 'my-docs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                الوثائق والدروس المرسلة من طرفك ({myDocs.length})
              </h2>
              <p className="text-xs text-slate-500">
                إجمالي تحميلات التلاميذ لملفاتك: {totalDownloads} تحميل
              </p>
            </div>

            <button
              onClick={() => setActiveTab('upload')}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إرسال وثيقة أخرى</span>
            </button>
          </div>

          {myDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">لم تقم بإرسال أي وثائق بعد</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يمكنك البدء بإرسال فروض أو دروس أو ملخصات Word و PDF لتصل فورياً إلى تلاميذ قسمك.
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
              >
                إرسال أول وثيقة الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  currentUser={currentUser}
                  onPreview={d => setPreviewDoc(d)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Announcements from Director */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <span>إعلانات إدارة المؤسسة والمدير الموجهة للسادة الأساتذة</span>
            </h2>
            <span className="text-xs text-slate-500">
              عدد الإعلانات: {teacherAnnouncements.length}
            </span>
          </div>

          <div className="space-y-4">
            {teacherAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
};
