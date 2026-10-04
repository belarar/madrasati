import React, { useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { SUBJECTS } from '../../data/mockData';
import {
  addPeerExchangeReply,
  deletePeerExchange,
  getPeerExchanges,
  savePeerExchange,
  thankPeerExchange,
} from '../../services/storageService';
import {
  FileFormat,
  PeerExchangePost,
  PeerExchangeType,
  SubjectId,
  UserProfile,
} from '../../types';
import { processAndCompressFile } from '../../utils/fileCompressor';

interface ClassmatesChannelProps {
  currentUser: UserProfile;
  onPostUpdated?: () => void;
}

export const ClassmatesChannel: React.FC<ClassmatesChannelProps> = ({
  currentUser,
  onPostUpdated,
}) => {
  const studentClassId = currentUser.classId || '2AM-2';
  const studentClassName = currentUser.className || 'القسم الدراسي';

  // State
  const [posts, setPosts] = useState<PeerExchangePost[]>(() =>
    getPeerExchanges(studentClassId)
  );
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<PeerExchangeType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'share' | 'request'>('share');
  const [formSubject, setFormSubject] = useState<SubjectId>('science');
  const [formType, setFormType] = useState<PeerExchangeType>('missed_lesson');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFile, setFormFile] = useState<{
    name: string;
    size: string;
    format: FileFormat;
    dataUrl: string;
  } | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reply state
  const [replyPostId, setReplyPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState<{
    name: string;
    size: string;
    format: FileFormat;
    dataUrl: string;
  } | null>(null);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Refresh helper
  const reloadPosts = () => {
    const updated = getPeerExchanges(studentClassId);
    setPosts(updated);
    if (onPostUpdated) onPostUpdated();
  };

  React.useEffect(() => {
    window.addEventListener('peer-exchanges-change', reloadPosts);
    return () => window.removeEventListener('peer-exchanges-change', reloadPosts);
  }, [studentClassId]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (selectedSubject !== 'ALL' && post.subjectId !== selectedSubject) {
        return false;
      }
      if (selectedType !== 'ALL' && post.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = post.title.toLowerCase().includes(q);
        const matchesContent = post.content.toLowerCase().includes(q);
        const matchesAuthor = post.studentName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesAuthor) return false;
      }
      return true;
    });
  }, [posts, selectedSubject, selectedType, searchQuery]);

  // Handle File Upload for Form (مع ضغط ذكي فوري لتفادي امتلاء ذاكرة المتصفح)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setFormError('حجم الملف كبير جداً. يرجى اختيار ملف أو صورة أقل من 12 ميغابايت.');
      return;
    }

    try {
      setFormError(null);
      const processed = await processAndCompressFile(file);
      setFormFile({
        name: processed.name,
        size: processed.sizeFormatted,
        format: processed.format as FileFormat,
        dataUrl: processed.dataUrl,
      });
    } catch {
      setFormError('تعذر معالجة هذا الملف. يرجى تجربة ملف آخر.');
    }
  };

  // Handle Submit Form
  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('يرجى كتابة عنوان للمنشور أو الدرس.');
      return;
    }
    if (!formContent.trim()) {
      setFormError('يرجى كتابة تفاصيل الدرس أو توضيح المطلوب للزملاء.');
      return;
    }

    setFormLoading(true);
    setTimeout(() => {
      savePeerExchange({
        classId: studentClassId,
        className: studentClassName,
        studentId: currentUser.identifier,
        studentName: currentUser.name,
        subjectId: formSubject,
        type: modalMode === 'request' ? 'lesson_request' : formType,
        title: formTitle.trim(),
        content: formContent.trim(),
        hasAttachment: !!formFile,
        fileName: formFile?.name,
        fileSize: formFile?.size,
        fileFormat: formFile?.format,
        fileDataUrl: formFile?.dataUrl,
      });

      setFormLoading(false);
      setIsModalOpen(false);
      setFormTitle('');
      setFormContent('');
      setFormFile(null);
      reloadPosts();
    }, 250);
  };

  // Handle Thank / Like
  const handleThank = (postId: string) => {
    thankPeerExchange(postId, currentUser.identifier);
    reloadPosts();
  };

  // Handle Delete
  const handleDelete = (postId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه المشاركة من قناة القسم؟')) {
      deletePeerExchange(postId);
      reloadPosts();
    }
  };

  // Handle Add Reply
  const handleSendReply = (postId: string) => {
    if (!replyText.trim() && !replyFile) return;

    addPeerExchangeReply(postId, {
      studentId: currentUser.identifier,
      studentName: currentUser.name,
      content: replyText.trim() || 'مرفق صورة/ملف للدرس المطلوب.',
      fileName: replyFile?.name,
      fileSize: replyFile?.size,
      fileFormat: replyFile?.format,
      fileDataUrl: replyFile?.dataUrl,
    });

    setReplyText('');
    setReplyFile(null);
    setReplyPostId(null);
    reloadPosts();
  };

  // Render Type Badge
  const renderTypeBadge = (type: PeerExchangeType) => {
    switch (type) {
      case 'missed_lesson':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span>📝</span>
            <span>درس فاتنا / نقل من السبورة</span>
          </span>
        );
      case 'homework_help':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span>📚</span>
            <span>واجب وتمارين اليوم</span>
          </span>
        );
      case 'summary_notes':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span>💡</span>
            <span>ملخص كراس ومراجعة</span>
          </span>
        );
      case 'absence_catchup':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <span>🩹</span>
            <span>استدراك بعد غياب</span>
          </span>
        );
      case 'lesson_request':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
            <span>🙋‍♂️</span>
            <span>طلب تصوير درس (تغيبت)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header for Classmates Channel */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute left-0 bottom-0 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-bold text-emerald-200">
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <span>فضاء التضامن الدراسي والتعاون بين الزملاء</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>قناة زملاء قسم {studentClassName}</span>
              <span className="text-xs bg-emerald-500/30 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                {studentClassId}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              مساحة تعاونية رسمية مغلقة ومخصصة لتلاميذ هذا القسم فقط لتبادل الدروس، مذكرات الكراريس، وتصوير ما فات الزملاء المتغيبين أو المتأخرين في النقل من السبورة.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setModalMode('share');
                setFormType('missed_lesson');
                setFormTitle('');
                setFormContent('');
                setFormFile(null);
                setFormError(null);
                setIsModalOpen(true);
              }}
              className="py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 active:scale-98"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>نشر درس أو كراس لزملائي</span>
            </button>

            <button
              onClick={() => {
                setModalMode('request');
                setFormType('lesson_request');
                setFormTitle('طلب درس أو كراس - كنت متغيباً');
                setFormContent('');
                setFormFile(null);
                setFormError(null);
                setIsModalOpen(true);
              }}
              className="py-3 px-4 rounded-2xl bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-400/30 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 active:scale-98"
            >
              <HelpCircle className="w-4 h-4 text-amber-300" />
              <span>طلب مساعدة / درس فاتني</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="ابحث في دروس وواجبات الزملاء..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-10 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 absolute left-2.5 top-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Subject Filter Dropdown */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">المادة:</span>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value as SubjectId | 'ALL')}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:border-emerald-600 outline-none w-full sm:w-auto"
            >
              <option value="ALL">جميع المواد التعليمية</option>
              {SUBJECTS.filter(s => s.id !== 'admin').map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              selectedType === 'ALL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({posts.length})
          </button>
          <button
            onClick={() => setSelectedType('missed_lesson')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedType === 'missed_lesson'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/60'
            }`}
          >
            <span>📝</span>
            <span>دروس منقولة</span>
          </button>
          <button
            onClick={() => setSelectedType('homework_help')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedType === 'homework_help'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100/80 border border-blue-200/60'
            }`}
          >
            <span>📚</span>
            <span>واجبات اليوم</span>
          </button>
          <button
            onClick={() => setSelectedType('summary_notes')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedType === 'summary_notes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200/60'
            }`}
          >
            <span>💡</span>
            <span>ملخصات كراس</span>
          </button>
          <button
            onClick={() => setSelectedType('lesson_request')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedType === 'lesson_request'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100/80 border border-rose-200/60'
            }`}
          >
            <span>🙋‍♂️</span>
            <span>طلبات استدراك غياب</span>
          </button>
        </div>
      </div>

      {/* Posts Stream */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Share2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">لا توجد منشورات في هذا التصنيف حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            كن أول من يساعد زملاءه! انقر على زر "نشر درس أو كراس لزملائي" لتصوير أو مشاركة ما فات الزملاء المتغيبين.
          </p>
          <button
            onClick={() => {
              setModalMode('share');
              setIsModalOpen(true);
            }}
            className="mt-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>نشر أول درس لقسمي</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => {
            const subject = SUBJECTS.find(s => s.id === post.subjectId);
            const isAuthor = post.studentId === currentUser.identifier;
            const hasThanked = post.thankedBy.includes(currentUser.identifier);
            const isReplying = replyPostId === post.id;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                      {post.studentName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{post.studentName}</span>
                        {isAuthor && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                            أنت
                          </span>
                        )}
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          (زميلكم في {post.className})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString('ar-DZ', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderTypeBadge(post.type)}
                    {subject && (
                      <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {subject.name}
                      </span>
                    )}
                    {isAuthor && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        title="حذف مشاركتي"
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    {post.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                    {post.content}
                  </p>
                </div>

                {/* Attachment Section */}
                {post.hasAttachment && post.fileDataUrl && (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                        {post.fileFormat === 'image' ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block truncate max-w-xs">
                          {post.fileName || 'مرفق الدرس / كراس التلميذ'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {post.fileSize || 'ملف مرفق'} • صيغة {post.fileFormat?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {post.fileFormat === 'image' && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: post.fileDataUrl!,
                              title: post.title,
                            })
                          }
                          className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>معاينة الصورة</span>
                        </button>
                      )}

                      <a
                        href={post.fileDataUrl}
                        download={post.fileName || `درس_${post.title}`}
                        className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل المرفق</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Footer Actions: Thank & Replies */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleThank(post.id)}
                      className={`py-1.5 px-3 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        hasThanked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${hasThanked ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                      <span>شكراً يا زميلي ({post.thanksCount})</span>
                    </button>

                    <button
                      onClick={() => setReplyPostId(isReplying ? null : post.id)}
                      className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold transition-colors flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        الردود ومساعدة الزملاء ({post.replies?.length || 0})
                      </span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-semibold">
                    متوسطة الشهيد بن نعمة مصطفى
                  </span>
                </div>

                {/* Replies Thread */}
                {(post.replies && post.replies.length > 0 || isReplying) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3 rounded-xl">
                    {/* Previous replies */}
                    {post.replies && post.replies.length > 0 && (
                      <div className="space-y-2">
                        {post.replies.map(rep => (
                          <div
                            key={rep.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{rep.studentName}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(rep.createdAt).toLocaleDateString('ar-DZ', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-slate-700 whitespace-pre-line">{rep.content}</p>

                            {rep.fileDataUrl && (
                              <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" />
                                  <span>{rep.fileName || 'صورة مرفقة'}</span>
                                </span>
                                <a
                                  href={rep.fileDataUrl}
                                  download={rep.fileName || 'مرفق_الرد'}
                                  className="text-[10px] text-emerald-700 hover:underline font-bold"
                                >
                                  تحميل
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Reply Input */}
                    {isReplying && (
                      <div className="space-y-2 pt-1">
                        <div className="relative">
                          <textarea
                            rows={2}
                            placeholder="اكتب ردك أو أضف توضيحاً لزميلك..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-600 outline-none"
                          />
                        </div>

                        {replyFile && (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between">
                            <span className="text-emerald-800 font-bold truncate">
                              📎 {replyFile.name}
                            </span>
                            <button
                              onClick={() => setReplyFile(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <label className="cursor-pointer py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors">
                            <Camera className="w-3.5 h-3.5 text-emerald-700" />
                            <span>إرفاق صورة كراس / ملف</span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              className="hidden"
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const processed = await processAndCompressFile(file);
                                  setReplyFile({
                                    name: processed.name,
                                    size: processed.sizeFormatted,
                                    format: processed.format as FileFormat,
                                    dataUrl: processed.dataUrl,
                                  });
                                } catch {
                                  // Fallback handled
                                }
                              }}
                            />
                          </label>

                          <button
                            onClick={() => handleSendReply(post.id)}
                            disabled={!replyText.trim() && !replyFile}
                            className="py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all"
                          >
                            <Send className="w-3 h-3" />
                            <span>إرسال الرد</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Community Mutual Aid Tip Box */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="block font-bold mb-0.5 text-amber-950">
            ميثاق التضامن والتعاون الأخوي بين تلاميذ متوسطة الشهيد بن نعمة مصطفى:
          </strong>
          المسلم في عون أخيه ما كان العبد في عون أخيه. تذكر أن مساعدة زميلك المتغيب بنقل الدرس أو توضيح الواجب المنزلي تعزز تفوق قسمكم وتزرع روح الأخوة والتكافل.
        </div>
      </div>

      {/* Publish New Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-800 to-emerald-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  {modalMode === 'share' ? (
                    <BookOpen className="w-5 h-5 text-emerald-300" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-amber-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {modalMode === 'share'
                      ? 'مشاركة درس أو كراس لزملائي'
                      : 'طلب تصوير درس أو مساعدة بعد غياب'}
                  </h3>
                  <p className="text-xs text-emerald-200">قسم {studentClassName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPost} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-right">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('share');
                    setFormType('missed_lesson');
                  }}
                  className={`py-2 px-3 rounded-lg transition-all ${
                    modalMode === 'share'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📝 مشاركة درس / كراس
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('request');
                    setFormType('lesson_request');
                  }}
                  className={`py-2 px-3 rounded-lg transition-all ${
                    modalMode === 'request'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🙋‍♂️ طلب درس (تغيبت)
                </button>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المادة التعليمية: <span className="text-red-500">*</span>
                </label>
                <select
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value as SubjectId)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:border-emerald-600 outline-none"
                >
                  {SUBJECTS.filter(s => s.id !== 'admin').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Post Type (If in share mode) */}
              {modalMode === 'share' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصنيف المنشور:
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as PeerExchangeType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:border-emerald-600 outline-none"
                  >
                    <option value="missed_lesson">📝 درس منقول من السبورة (لمن تغيب)</option>
                    <option value="homework_help">📚 واجب منزلي وتوضيح التمارين</option>
                    <option value="summary_notes">💡 ملخص شامل ومراجعة كراس</option>
                    <option value="absence_catchup">🩹 كراس كامل لاستدراك غياب أسبوعي</option>
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الدرس أو الطلب: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    modalMode === 'share'
                      ? 'مثال: درس العلوم - التنسيق العصبي لحصة اليوم'
                      : 'مثال: أرجو تصوير درس الرياضيات صفحة 45 لحصة الأربعاء'
                  }
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص وتفاصيل الدرس / الملاحظات: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    modalMode === 'share'
                      ? 'اكتب هنا عناصر الدرس المنقولة، تعريفات هامة، أو نص الواجب لزملائك...'
                      : 'وضح لزملائك سبب الغياب والتاريخ أو الصفحة التي تحتاجها من الكراس...'
                  }
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 outline-none leading-relaxed"
                />
              </div>

              {/* File / Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إرفاق صورة كراس أو ملف الدرس (اختياري لكن يُنصح به بشدة):
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-emerald-700 mb-2 border border-slate-200">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    انقر لتصوير أو اختيار صورة الكراس أو ملف PDF
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    الصور (JPG, PNG)، مستندات PDF أو Word (حتى 8 ميغابايت)
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>

                {formFile && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold text-emerald-950 truncate">{formFile.name}</span>
                      <span className="text-[10px] text-emerald-700 font-mono">({formFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFile(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ النشر في قناة القسم...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>نشر الآن في قناة القسم</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm truncate max-w-md">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto rounded-xl object-contain shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
              <a
                href={previewImage.url}
                download="صورة_الكراس"
                className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الصورة بجودة عالية</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
