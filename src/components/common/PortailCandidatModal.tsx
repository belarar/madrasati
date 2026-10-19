import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  GraduationCap,
  Info,
  Printer,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { OFFICIAL_STUDENTS_LIST } from '../../data/officialStudents';
import { SCHOOL_NAME } from '../../data/mockData';
import { UserProfile } from '../../types';

interface PortailCandidatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
}

export const PortailCandidatModal: React.FC<PortailCandidatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'convocation' | 'topics' | 'onec_link' | 'guidelines'>('convocation');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentUser?.role === 'student' ? currentUser.identifier : '1098548010401401'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  if (!isOpen) return null;

  // Filter 4AM candidates
  const candidates4AM = OFFICIAL_STUDENTS_LIST.filter(s => s.classId.startsWith('4AM'));
  const currentCandidate = candidates4AM.find(s => s.identifier === selectedStudentId) || candidates4AM[0];

  const filteredCandidates = candidates4AM.filter(s => {
    const name = `${s.surname} ${s.firstName}`;
    return name.includes(searchQuery) || s.identifier.includes(searchQuery);
  });

  const bemSubjects = [
    { id: 'math', name: 'الرياضيات', coef: 4 },
    { id: 'arabic', name: 'اللغة العربية', coef: 5 },
    { id: 'french', name: 'اللغة الفرنسية', coef: 3 },
    { id: 'english', name: 'اللغة الإنجليزية', coef: 2 },
    { id: 'physics', name: 'العلوم الفيزيائية والتكنولوجيا', coef: 2 },
    { id: 'science', name: 'علوم الطبيعة والحياة', coef: 2 },
    { id: 'history', name: 'التاريخ والجغرافيا', coef: 3 },
    { id: 'islamic', name: 'التربية الإسلامية', coef: 2 },
    { id: 'civic', name: 'التربية المدنية', coef: 1 },
  ];

  const pastPapers = [
    {
      year: '2024',
      subject: 'الرياضيات',
      subjectId: 'math',
      title: 'موضوع امتحان شهادة BEM دورة 2024 + الحل النموذجي',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2024',
      subject: 'اللغة العربية',
      subjectId: 'arabic',
      title: 'موضوع اللغة العربية دورة 2024 مع عناصر الإجابة وسلم التنقيط',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2024',
      subject: 'علوم الطبيعة والحياة',
      subjectId: 'science',
      title: 'موضوع العلوم الطبيعية دورة 2024 مع الحل والشرح',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2024',
      subject: 'العلوم الفيزيائية',
      subjectId: 'physics',
      title: 'موضوع الفيزياء والتكنولوجيا دورة 2024 مع نموذج التصحيح الوزاري',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2023',
      subject: 'الرياضيات',
      subjectId: 'math',
      title: 'موضوع الرياضيات BEM 2023 دورة جوان مع شبكة التقويم',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2023',
      subject: 'اللغة العربية',
      subjectId: 'arabic',
      title: 'موضوع اللغة العربية دورة 2023 مع الإجابة النموذجية',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2023',
      subject: 'التاريخ والجغرافيا',
      subjectId: 'history',
      title: 'موضوع الاجتماعيات دورة 2023 مع سلم التنقيط',
      type: 'موضوع + تصحيح',
    },
    {
      year: '2023',
      subject: 'اللغة الفرنسية',
      subjectId: 'french',
      title: 'Sujet BEM Français 2023 avec corrigé officiel',
      type: 'موضوع + تصحيح',
    },
  ];

  const filteredPapers = selectedSubject === 'ALL'
    ? pastPapers
    : pastPapers.filter(p => p.subjectId === selectedSubject);

  const handlePrintConvocation = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-right">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-yellow-400 text-emerald-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Award className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-yellow-300 uppercase tracking-wide">
                  الديوان الوطني للامتحانات والمسابقات (ONEC)
                </span>
                <span className="text-white/40">•</span>
                <span className="text-[10px] sm:text-xs text-emerald-200">دورة 2025</span>
              </div>
              <h2 className="text-base sm:text-xl font-extrabold text-white">
                بوابة المترشح لشهادة التعليم المتوسط (Portail Candidat BEM)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white border border-white/20 hover:border-rose-400 transition-all cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-4 h-4 text-white" />
            <span className="text-xs font-bold hidden sm:inline">إغلاق</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('convocation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'convocation'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>بطاقة المترشح والاستدعاء</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('topics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'topics'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>بنك مواضيع وتصحيحات BEM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('onec_link')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'onec_link'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>موقع الديوان الرسمي (bem.onec.dz)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'guidelines'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>تعليمات وإرشادات الامتحان</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: CONVOCATION & CANDIDATE CARD */}
          {activeTab === 'convocation' && (
            <div className="space-y-5">
              {/* Select candidate */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-6 h-6 text-emerald-700 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                      معاينة استمارة المترشح لشهادة BEM (دورة 2025)
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      مستخرجة مباشرة من سجلات الرقمنة الرسمية لمتوسطة الشهيد بن نعمة مصطفى.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full sm:w-64 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    {candidates4AM.map(cand => (
                      <option key={cand.identifier} value={cand.identifier}>
                        {cand.surname} {cand.firstName} ({cand.className})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handlePrintConvocation}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
                    title="طباعة الاستمارة"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">طباعة</span>
                  </button>
                </div>
              </div>

              {/* Printable Official Card */}
              {currentCandidate && (
                <div className="border-2 border-slate-300 rounded-2xl p-6 bg-white space-y-4 shadow-sm" id="printable-candidate-card">
                  {/* Institutional Header */}
                  <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                    <p className="text-[11px] font-bold text-slate-600">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                    <p className="text-xs font-extrabold text-slate-800">وزارة التربية الوطنية - الديوان الوطني للامتحانات والمسابقات</p>
                    <div className="inline-block bg-slate-900 text-yellow-300 px-4 py-1 rounded-full text-xs font-black mt-1">
                      بطاقة معلومات المترشح لامتحان شهادة التعليم المتوسط (BEM)
                    </div>
                  </div>

                  {/* Candidate Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500">اللقب والاسم:</span>
                        <strong className="text-slate-900 text-sm">{currentCandidate.surname} {currentCandidate.firstName}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500">تاريخ الميلاد:</span>
                        <span className="text-slate-800 font-bold">{currentCandidate.birthDate}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500">الجنس:</span>
                        <span className="text-slate-800 font-bold">{currentCandidate.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">رقم التعريف المدرسي الوطني:</span>
                        <span className="font-mono text-emerald-800 font-black">{currentCandidate.identifier}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500">المؤسسة الأصلية:</span>
                        <strong className="text-slate-900">{SCHOOL_NAME}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500">القسم:</span>
                        <span className="text-slate-800 font-bold">{currentCandidate.className}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500">صفة المترشح:</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مترشح متمدرس رسمي</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">اللغة الحية الثانية:</span>
                        <span className="text-slate-800 font-bold">اللغة الإنجليزية</span>
                      </div>
                    </div>
                  </div>

                  {/* Examination Schedule Summary */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden mt-2 text-xs">
                    <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 border-b border-slate-200">
                      جدول المواد المقررة في امتحان شهادة التعليم المتوسط
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50/50">
                      {bemSubjects.map(s => (
                        <div key={s.id} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-800">{s.name}</span>
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold font-mono">
                            معامل {s.coef}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stamp & Signature Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
                    <div className="text-center w-40">
                      <span className="text-slate-500 block mb-1">توقيع المترشح:</span>
                      <div className="h-10 border-b border-dashed border-slate-300" />
                    </div>
                    <div className="text-center w-48">
                      <span className="text-slate-500 block mb-1">ختم وتوقيع مدير المؤسسة:</span>
                      <div className="text-[11px] font-bold text-emerald-900 border border-emerald-300 bg-emerald-50 rounded-lg p-1.5">
                        متوسطة بن نعمة مصطفى - غليزان
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TOPICS & PAST PAPERS */}
          {activeTab === 'topics' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    بنك مواضيع وتصحيحات شهادة BEM الرسمية
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    مواضيع معتمدة مع عناصر الإجابة وسلم التنقيط للتحضير الممتاز.
                  </p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSubject('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      selectedSubject === 'ALL'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    الكل
                  </button>
                  {bemSubjects.slice(0, 5).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSubject(s.id)}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        selectedSubject === s.id
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {filteredPapers.map((paper, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                          دورة {paper.year}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          {paper.subject}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 truncate">
                        {paper.title}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        يتضمن الأسئلة، سلم التنقيط وشبكة التقويم البيداغوجي.
                      </p>
                    </div>

                    <a
                      href="https://bem.onec.dz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ONEC OFFICIAL PORTAL LINK */}
          {activeTab === 'onec_link' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl space-y-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-yellow-300">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-white">
                      موقع الديوان الوطني للامتحانات والمسابقات - Portail BEM
                    </h4>
                    <p className="text-xs text-blue-200">
                      البوابة الرسمية لسحب الاستدعاءات والاطلاع على نتائج شهادة التعليم المتوسط.
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-xs space-y-2 text-blue-50 leading-relaxed">
                  <p>
                    • <strong>سحب الاستدعاء:</strong> يفتح الديوان الموقع عادة ابتداءً من شهر ماي لسحب استدعاءات المترشحين المتمدرسين والأحرار.
                  </p>
                  <p>
                    • <strong>البيانات المطلوبة:</strong> اسم المستخدم وكلمة السر المطبوعة في وصل الترشح، أو رقم التعريف المدرسي.
                  </p>
                  <p>
                    • <strong>إعلان النتائج:</strong> يتم الاطلاع على النتائج وسحب كشف النقاط عبر نفس البوابة فور الإعلان الرسمي.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="https://bem.onec.dz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    <span>الدخول إلى موقع bem.onec.dz الرسمي</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href="https://tarbiya.education.gov.dz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 transition-transform active:scale-95"
                  >
                    <span>فضاء الأولياء الرقمي</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GUIDELINES */}
          {activeTab === 'guidelines' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>إرشادات وتعليمات هامة لمترشحي شهادة التعليم المتوسط</span>
                </h4>
                <ul className="space-y-2 text-xs text-amber-900 leading-relaxed list-disc list-inside">
                  <li>الحضور إلى مركز الإجراء قبل 30 دقيقة على الأقل من موعد انطلاق الاختبار.</li>
                  <li>إحضار الاستدعاء الرسمي وبطاقة التعريف المدرسية الأصلية في كل الفترات.</li>
                  <li>يُمنع منعاً باتاً إدخال الهواتف الذكية أو الساعات الإلكترونية أو أجهزة البلوتوث إلى قاعات الامتحان.</li>
                  <li>استعمال الآلة الحاسبة العلمية غير القابلة للبرمجة فقط.</li>
                  <li>الكتابة بلون موحد (أزرق أو أسود) والامتناع عن استعمال المصحح (Blanco) أو الإشارات المميزة على ورقة الإجابة.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 px-6 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>متوسطة الشهيد بن نعمة مصطفى - مرافقة ودعم مترشحي BEM</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
