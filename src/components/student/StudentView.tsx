import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  Info,
  Layers,
  Search,
  Share2,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES, SUBJECTS } from '../../data/mockData';
import { getPeerExchanges, registerNewUser } from '../../services/storageService';
import {
  ParentSummon,
  SchoolAnnouncement,
  SchoolDocument,
  SubjectId,
  UserProfile,
} from '../../types';
import { AnnouncementCard } from '../common/AnnouncementCard';
import { DocumentCard } from '../common/DocumentCard';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal';
import { SummonModal } from '../common/SummonModal';
import { ClassmatesChannel } from './ClassmatesChannel';

interface StudentViewProps {
  currentUser: UserProfile;
  documents: SchoolDocument[];
  announcements: SchoolAnnouncement[];
  summons: ParentSummon[];
  onRefreshData?: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  currentUser,
  documents,
  announcements,
  summons,
  onRefreshData,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'all_school' | 'my_class'>('all_school');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'documents' | 'peer_exchange' | 'announcements' | 'summons'>('documents');
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);
  const [selectedSummon, setSelectedSummon] = useState<ParentSummon | null>(null);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editClassId, setEditClassId] = useState(currentUser.classId || '4AM-1');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    const selectedClass = SCHOOL_CLASSES.find(c => c.id === editClassId);
    const updatedUser: UserProfile = {
      ...currentUser,
      name: editName.trim(),
      classId: editClassId,
      className: selectedClass?.name || '4 متوسط 1',
    };
    registerNewUser(updatedUser);
    setIsEditingProfile(false);
    if (onRefreshData) onRefreshData();
  };

  // Filter documents meant for this student's class or "ALL"
  const studentClassId = currentUser.classId || '4AM-1';

  // Count documents targeted to student's class or level
  const myClassDocsCount = useMemo(() => {
    const studentLevel = studentClassId.split('-')[0];
    return documents.filter(doc => {
      if (doc.targetAudience === 'teachers' || doc.targetAudience === 'staff') return false;
      const targetClasses = Array.isArray(doc.targetClasses) ? doc.targetClasses : ['ALL'];
      return (
        targetClasses.length === 0 ||
        targetClasses.includes('ALL') ||
        targetClasses.includes(studentClassId) ||
        targetClasses.includes(studentLevel) ||
        (currentUser.className && targetClasses.some(c => currentUser.className?.includes(c)))
      );
    }).length;
  }, [documents, studentClassId, currentUser.className]);

  const relevantDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Check Target Audience
      if (doc.targetAudience === 'teachers' || doc.targetAudience === 'staff') {
        return false;
      }

      const targetClasses = Array.isArray(doc.targetClasses) ? doc.targetClasses : ['ALL'];

      if (doc.targetAudience === 'specific_student') {
        const matchesId = doc.targetStudentId && doc.targetStudentId === currentUser.identifier;
        const matchesName = doc.targetStudentName && currentUser.name && doc.targetStudentName.trim() === currentUser.name.trim();
        if (!matchesId && !matchesName) return false;
      }

      // If scopeFilter is 'my_class', only include if targeted to student's class, level, or ALL
      if (scopeFilter === 'my_class') {
        const studentLevel = studentClassId.split('-')[0]; // e.g. '4AM'
        const isTargeted =
          targetClasses.length === 0 ||
          targetClasses.includes('ALL') ||
          targetClasses.includes(studentClassId) ||
          targetClasses.includes(studentLevel) ||
          (currentUser.className && targetClasses.some(c => currentUser.className?.includes(c)));

        if (!isTargeted) return false;
      }

      // Filter by subject
      if (selectedSubject !== 'ALL' && doc.subject !== selectedSubject) {
        return false;
      }

      // Filter by type
      if (selectedType !== 'ALL' && doc.docType !== selectedType) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q);
        const matchesAuthor = doc.authorName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor) return false;
      }

      return true;
    });
  }, [documents, scopeFilter, studentClassId, currentUser.className, currentUser.identifier, currentUser.name, selectedSubject, selectedType, searchQuery]);

  // Announcements targeted to students or all
  const studentAnnouncements = useMemo(() => {
    return announcements.filter(
      a => a.target === 'students' || a.target === 'all'
    );
  }, [announcements]);

  // Summons for this specific student by identifier or name
  const studentSummons = useMemo(() => {
    return summons.filter(
      s =>
        s.studentId === currentUser.identifier ||
        s.studentName.toLowerCase().includes(currentUser.name.toLowerCase())
    );
  }, [summons, currentUser.identifier, currentUser.name]);

  // Peer exchanges for this student's class
  const classPeerPosts = useMemo(() => {
    return getPeerExchanges(studentClassId);
  }, [studentClassId]);

  return (
    <div className="space-y-6">
      {/* Student Profile Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-white/15">
              <GraduationCap className="w-4 h-4" />
              <span>فضاء التلميذ الرقمي</span>
              <span className="opacity-60">•</span>
              <span>رقم التعريف المدرسي: {currentUser.identifier}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                مرحباً بك، {currentUser.name}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setEditName(currentUser.name);
                  setEditClassId(currentUser.classId || '4AM-1');
                  setIsEditingProfile(true);
                }}
                className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/25 transition-all flex items-center gap-1.5 shadow-2xs"
                title="تعديل اسمك أو تغيير قسمك الدراسي"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل اسمي وقسمي</span>
              </button>
            </div>

            <p className="text-emerald-100 text-sm max-w-xl">
              قسم: <strong className="text-white font-bold">{currentUser.className || 'السنة الرابعة متوسط'}</strong>
              {' '}- يمكنك تصفح وتحميل الفروض والدروس والملخصات (Word, PDF) الصادرة عن أساتذتك بكل سهولة.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[100px] text-center">
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">وثائق قسمك</span>
              <span className="text-2xl font-black text-white">{relevantDocuments.length}</span>
            </div>

            <button
              onClick={() => setActiveTab('peer_exchange')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[100px] text-center transition-all cursor-pointer"
            >
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">دروس الزملاء</span>
              <span className="text-2xl font-black text-emerald-300">{classPeerPosts.length}</span>
            </button>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[100px] text-center">
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">إعلانات جديدة</span>
              <span className="text-2xl font-black text-white">{studentAnnouncements.length}</span>
            </div>

            {studentSummons.length > 0 && (
              <button
                onClick={() => setActiveTab('summons')}
                className="bg-amber-500/30 hover:bg-amber-500/40 backdrop-blur-md rounded-2xl p-3.5 border border-amber-300/40 min-w-[120px] text-center transition-all animate-pulse"
              >
                <span className="text-xs text-amber-200 block mb-0.5 font-bold">استدعاء ولي الأمر</span>
                <span className="text-2xl font-black text-amber-100">{studentSummons.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* Summons Alert Banner if active */}
        {studentSummons.length > 0 && (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/20 border border-amber-300/30 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
              <span>
                تنبيه: تم تسجيل استدعاء رسمي لولي أمرك لمقابلة ناظر المتوسطة يوم{' '}
                <strong>{studentSummons[0].appointmentDate}</strong>.
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedSummon(studentSummons[0]);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 transition-colors"
            >
              عرض الاستدعاء والوصل
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'documents'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الوثائق والدروس والفروض ({relevantDocuments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('peer_exchange')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === 'peer_exchange'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>قناة الزملاء وتبادل الدروس</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              {classPeerPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === 'announcements'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>الإعلانات والتوجيهات ({studentAnnouncements.length})</span>
          </button>

          {studentSummons.length > 0 && (
            <button
              onClick={() => setActiveTab('summons')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'summons'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>استدعاءات الولي ({studentSummons.length})</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500">
          المؤسسة: متوسطة الشهيد بن نعمة مصطفى - السنة الدراسية 2024/2025
        </div>
      </div>

      {/* View: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Search & Filters Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن وثيقة، درس، واجب منزلي، أو اسم الأستاذ..."
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            {/* Scope Selector: All School vs My Class */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 ml-1">عرض الوثائق:</span>
              <button
                type="button"
                onClick={() => setScopeFilter('all_school')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  scopeFilter === 'all_school'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>كافة وثائق المؤسسة ({documents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setScopeFilter('my_class')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  scopeFilter === 'my_class'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>الموجهة لقسمي فقط ({myClassDocsCount})</span>
              </button>
            </div>

            {/* Subject Filters Pills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تصفية حسب المادة التعليمية:</span>
                </span>
                {selectedSubject !== 'ALL' && (
                  <button
                    onClick={() => setSelectedSubject('ALL')}
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    إعادة ضبط المواد
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedSubject('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedSubject === 'ALL'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  جميع المواد
                </button>
                {SUBJECTS.map(subj => (
                  <button
                    key={subj.id}
                    onClick={() => setSelectedSubject(subj.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      selectedSubject === subj.id
                        ? 'bg-emerald-700 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {subj.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Type Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500 shrink-0 ml-1">نوع الوثيقة:</span>
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'bem_prep', label: 'تحضير شهادة BEM' },
                { id: 'summary', label: 'ملخصات' },
                { id: 'homework', label: 'واجبات منزلية' },
                { id: 'test', label: 'فروض واختبارات' },
                { id: 'lesson', label: 'دروس ومطبوعات' },
                { id: 'exercise', label: 'سلاسل تمارين' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                    selectedType === t.id
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid */}
          {relevantDocuments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">لا توجد وثائق مطابقة حالياً</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                لم يقم الأساتذة برفع وثائق جديدة تطابق معايير البحث المحددة. جرب تغيير المادة أو تفقد الإعلانات.
              </p>
              <button
                onClick={() => {
                  setSelectedSubject('ALL');
                  setSelectedType('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
              >
                عرض جميع الوثائق المتاحة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {relevantDocuments.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  currentUser={currentUser}
                  onPreview={d => setPreviewDoc(d)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* View: Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <span>إعلانات إدارة المتوسطة والناظر الموجهة للتلاميذ</span>
            </h2>
            <span className="text-xs text-slate-500">
              إجمالي الإعلانات: {studentAnnouncements.length}
            </span>
          </div>

          <div className="space-y-4">
            {studentAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      )}

      {/* View: Summons (استدعاءات الولي) */}
      {activeTab === 'summons' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 text-base">
                استدعاءات رسمية لولي الأمر مسجلة لدى الناظر
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                في حالة وجود استدعاء، يجب إبلاغ ولي أمرك (الأب أو الأم أو الوصي الشرعي) بالموعد المحدد للحضور إلى المؤسسة لمقابلة السيد ناظر المتوسطة.
              </p>
            </div>
          </div>

          {studentSummons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">لا يوجد أي استدعاء مسجل بحقك</p>
              <p className="text-xs text-slate-500 mt-1">
                سجلك الانضباطي والمدرسي منتظم دون استدعاءات أولياء.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentSummons.map(summon => (
                <div
                  key={summon.id}
                  className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        استدعاء رسمي
                      </span>
                      <span className="text-xs text-slate-500">
                        بتاريخ: {new Date(summon.issuedAt).toLocaleDateString('ar-DZ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">
                      الموعد: يوم {summon.appointmentDate} على الساعة {summon.appointmentTime}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600">
                      <strong>السبب:</strong> {summon.reasonDetails || summon.reason}
                    </p>

                    <div className="text-xs text-slate-500">
                      مقدم الاستدعاء: <strong className="text-slate-700">{summon.issuedBy}</strong> | ولي الأمر: {summon.guardianName} ({summon.guardianPhone})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSummon(summon)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span>عرض وصل الاستدعاء</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View: Classmates Channel */}
      {activeTab === 'peer_exchange' && (
        <ClassmatesChannel
          currentUser={currentUser}
          onPostUpdated={onRefreshData}
        />
      )}

      {/* Modals */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <SummonModal
        summon={selectedSummon}
        currentUser={currentUser}
        onClose={() => setSelectedSummon(null)}
        onStatusUpdated={onRefreshData}
      />

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-emerald-300" />
                <h3 className="font-bold text-base">تعديل بيانات التلميذ والقسم</h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم التعريف المدرسي:
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.identifier}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-mono"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  رقم التعريف المدرسي الوطني المعتمد في الرقمنة.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم واللقب: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="مثال: محمد بن نعمة"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  القسم والفوج الدراسي: <span className="text-red-500">*</span>
                </label>
                <select
                  value={editClassId}
                  onChange={e => setEditClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white"
                >
                  {SCHOOL_CLASSES.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ستظهر لك فقط الوثائق والفروض الموجهة لقسمك المختار.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-xs transition-transform active:scale-98"
                >
                  حفظ البيانات والدخول
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
