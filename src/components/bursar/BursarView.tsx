import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileText,
  Filter,
  LogOut,
  MapPin,
  Megaphone,
  Printer,
  Search,
  Send,
  Shield,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { SCHOOL_NAME } from '../../data/mockData';
import { getWorkersList, OfficialStaffMember } from '../../data/officialStaff';
import {
  deleteInternalStaffSummon,
  getInternalStaffSummons,
  saveInternalStaffSummon,
  updateInternalStaffSummonStatus,
} from '../../services/storageService';
import { InternalStaffSummon, UserProfile } from '../../types';

interface BursarViewProps {
  currentUser: UserProfile;
  onRefreshData?: () => void;
}

export const BursarView: React.FC<BursarViewProps> = ({ currentUser, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'workers' | 'new-summon' | 'summons-log'>('workers');

  // Workers List
  const workers = getWorkersList();
  const [workerSearch, setWorkerSearch] = useState('');

  // Internal Summons State
  const [summons, setSummons] = useState<InternalStaffSummon[]>(() => getInternalStaffSummons());
  const bursarSummons = summons.filter(s => s.issuerRole === 'bursar');

  // Form State for new summon
  const [targetMode, setTargetMode] = useState<'single' | 'all'>('single');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workers[0]?.identifier || '');
  const [summonReason, setSummonReason] = useState('صيانة وترميم المرافق والمكاتب المدرسية');
  const [reasonDetails, setReasonDetails] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [appointmentTime, setAppointmentTime] = useState('08:30 صباحاً');
  const [location, setLocation] = useState('مكتب المقتصدة (المصالح الاقتصادية)');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected summon for modal printable preview
  const [previewSummon, setPreviewSummon] = useState<InternalStaffSummon | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setSummons(getInternalStaffSummons());
    };
    window.addEventListener('internal-staff-summons-change', handleUpdate);
    return () => window.removeEventListener('internal-staff-summons-change', handleUpdate);
  }, []);

  const filteredWorkers = workers.filter(
    w =>
      `${w.surname} ${w.firstName}`.includes(workerSearch) ||
      w.rank.includes(workerSearch) ||
      w.identifier.includes(workerSearch)
  );

  const predefinedReasons = [
    'صيانة وترميم المرافق والمكاتب المدرسية',
    'تنظيف الساحة والحجرات والأروقة والممرات',
    'صيانة شبكة التدفئة المركزية والكهرباء والإنارة',
    'صيانة وإصلاح شبكة الصرف الصحي ودورات المياه',
    'العناية بالمساحات الخضراء والحديقة المدرسية',
    'تجهيز وترتيب قاعات الامتحانات والأنشطة',
    'استلام وتفريغ المؤونة والتجهيزات والمستلزمات',
    'اجتماع عمل داخلي وتوزيع جدول المناوبة اليومية',
    'استدعاء إداري عاجل لمكتب المقتصدة',
  ];

  const handleStartSummonForWorker = (worker: OfficialStaffMember) => {
    setTargetMode('single');
    setSelectedWorkerId(worker.identifier);
    setActiveTab('new-summon');
  };

  const handleCreateSummon = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    const isAll = targetMode === 'all';
    const targetWorker = workers.find(w => w.identifier === selectedWorkerId);

    const newSummon = saveInternalStaffSummon({
      targetType: isAll ? 'all_workers' : 'worker',
      targetStaffIdentifier: isAll ? 'ALL' : targetWorker?.identifier,
      targetStaffName: isAll ? 'كافة العمال المهنيين وأعوان الوقاية' : `${targetWorker?.surname} ${targetWorker?.firstName}`,
      targetStaffRank: isAll ? 'مجموع سلك العمال المهنيين (10 عمال)' : targetWorker?.rank,
      issuerRole: 'bursar',
      issuerName: `${currentUser.name} (${currentUser.title || 'المقتصدة'})`,
      reason: summonReason,
      reasonDetails: reasonDetails.trim() || undefined,
      appointmentDate,
      appointmentTime,
      location,
    });

    setSummons(getInternalStaffSummons());
    setSuccessMessage(
      isAll
        ? 'تم إصدار وتعميم الاستدعاء / التكليف بمهمة لكافة العمال المهنيين بنجاح!'
        : `تم إصدار الاستدعاء للعامل المهني (${newSummon.targetStaffName}) بنجاح!`
    );
    setPreviewSummon(newSummon);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Hero Banner for Bursar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-white/15">
              <Coins className="w-4 h-4 text-yellow-300" />
              <span>المصالح الاقتصادية والمالية • إدارة العمال المهنيين</span>
              <span className="opacity-60">•</span>
              <span>رقم التعريف: {currentUser.identifier}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              فضاء المقتصدة - {currentUser.name}
            </h1>

            <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
              المسؤولة المباشرة عن تسيير وتأطير <strong>العمال المهنيين وأعوان الوقاية والصيانة</strong>، إصدار أوامر التكليف بالمهام، ومتابعة أشغال الصيانة والنظافة والوسائل العامة بمتوسطة الشهيد بن نعمة مصطفى.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">العمال المهنيون</span>
              <span className="text-2xl font-black text-white">{workers.length}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 min-w-[110px] text-center">
              <span className="text-xs text-emerald-200 block mb-0.5 font-medium">الاستدعاءات الصادرة</span>
              <span className="text-2xl font-black text-yellow-300">{bursarSummons.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('workers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'workers'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>العمال المهنيون المسندون ({workers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new-summon')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'new-summon'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>استدعاء عامل أو تكليف بمهمة ➕</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summons-log')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'summons-log'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سجل وأرشيف التكليفات ({bursarSummons.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setTargetMode('all');
            setActiveTab('new-summon');
          }}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
        >
          <Users className="w-4 h-4" />
          <span>استدعاء جماعي لكافة العمال المهنيين</span>
        </button>
      </div>

      {/* TAB 1: WORKERS ROSTER */}
      {activeTab === 'workers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                placeholder="ابحث عن عامل مهني بالاسم أو الرتبة..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-teal-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              العمال المهنيون يتبعون إشراف المقتصدة مباشرة لصيانة ومتابعة كافة مرافق المؤسسة.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredWorkers.map(w => (
              <div
                key={w.identifier}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-bold text-sm shrink-0">
                      <Wrench className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {w.surname} {w.firstName}
                      </h4>
                      <p className="text-[11px] text-teal-800 font-bold mt-0.5">
                        {w.rank}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono shrink-0">
                    درجة {w.grade}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الرمز المهني:</span>
                    <span className="font-bold text-slate-800">{w.identifier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">تاريخ السريان:</span>
                    <span>{w.effectiveDate}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartSummonForWorker(w)}
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-700 text-teal-800 hover:text-white border border-teal-300 hover:border-teal-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>استدعاء / تكليف بمهمة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: NEW SUMMON FORM */}
      {activeTab === 'new-summon' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              إصدار استدعاء داخلي أو أمر بتكليف بمهمة للعامل المهني
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              يصدر عن المقتصدة لمتابعة أعمال الصيانة، النظافة، الحراسة والوسائل العامة، مع توثيق رسمي قابل للطباعة والإشعار الفوري.
            </p>
          </div>

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateSummon} className="space-y-5">
            {/* Target mode: Single Worker vs All Workers */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                نطاق الاستدعاء: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetMode('single')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                    targetMode === 'single'
                      ? 'bg-teal-50 border-teal-600 text-teal-950 font-black shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-5 h-5 text-teal-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">استدعاء عامل مهني فردي (محدد)</div>
                    <div className="text-[11px] text-slate-500 font-normal">توجيه الاستدعاء أو المهمة لعامل مهني بعينه.</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode('all')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                    targetMode === 'all'
                      ? 'bg-amber-50 border-amber-600 text-amber-950 font-black shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">استدعاء جماعي لكافة العمال المهنيين (10 عمال)</div>
                    <div className="text-[11px] text-slate-500 font-normal">توجيه تكليف عام لحملة نظافة، تهيئة أو اجتماع تنسيقي.</div>
                  </div>
                </button>
              </div>
            </div>

            {/* If Single: Worker Dropdown */}
            {targetMode === 'single' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اختيار العامل المهني المعني: <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedWorkerId}
                  onChange={e => setSelectedWorkerId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-teal-600 bg-white"
                >
                  {workers.map(w => (
                    <option key={w.identifier} value={w.identifier}>
                      {w.surname} {w.firstName} — ({w.rank})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Predefined Reasons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                موضوع الاستدعاء / التكليف بمهمة: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2.5">
                {predefinedReasons.map((r, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSummonReason(r)}
                    className={`p-2 rounded-xl border text-xs font-bold text-right transition-all ${
                      summonReason === r
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={summonReason}
                onChange={e => setSummonReason(e.target.value)}
                placeholder="أو اكتب موضوعاً مخصصاً..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-teal-600"
              />
            </div>

            {/* Date, Time, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الحضور / الإنجاز: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-teal-600 font-mono"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التوقيت: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={appointmentTime}
                    onChange={e => setAppointmentTime(e.target.value)}
                    placeholder="مثال: 08:30 صباحاً"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-teal-600"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مكان الاجتماع / المهمة: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="مكتب المقتصدة أو الساحة"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-teal-600"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تفاصيل إضافية أو تعليمات أمن وسلامة:
              </label>
              <textarea
                rows={2}
                value={reasonDetails}
                onChange={e => setReasonDetails(e.target.value)}
                placeholder="تعليمات إضافية حول التجهيزات، العتاد المطلوب أو إرشادات السلامة..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-teal-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>إصدار الاستدعاء وتوثيقه رسمياً</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SUMMONS LOG & HISTORY */}
      {activeTab === 'summons-log' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              سجل استدعاءات وتكليفات العمال المهنيين المسجلة ({bursarSummons.length})
            </h4>
            <span className="text-xs text-slate-500">
              يمكنك معاينة الاستدعاء وطباعته أو تأكيد إنجاز المهمة.
            </span>
          </div>

          {bursarSummons.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FileCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">لا توجد استدعاءات مسجلة حالياً</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يمكنك إصدار استدعاء أو تكليف بمهمة فردي أو جماعي للعمال المهنيين عبر تبويب "استدعاء عامل أو تكليف بمهمة".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {bursarSummons.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-teal-900 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                        {s.targetStaffName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({s.targetStaffRank || 'عامل مهني'})
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          s.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.status === 'completed'
                          ? 'تم الإنجاز بنجاح'
                          : s.status === 'cancelled'
                          ? 'ملغى'
                          : 'قيد المتابعة / مبرمج'}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900">{s.reason}</h5>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.appointmentDate}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.appointmentTime}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.location || 'مكتب المقتصدة'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewSummon(s)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="معاينة وطباعة الاستدعاء"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>معاينة وطباعة</span>
                    </button>

                    {s.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          updateInternalStaffSummonStatus(s.id, 'completed');
                          setSummons(getInternalStaffSummons());
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-colors"
                        title="تأكيد حضور العامل وإنجاز المهمة"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الإنجاز</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        deleteInternalStaffSummon(s.id);
                        setSummons(getInternalStaffSummons());
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف من السجل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Printable Summon Modal */}
      {previewSummon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-yellow-300" />
                <h4 className="text-sm font-bold">معاينة استدعاء العامل المهني الرسمي للطباعة</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSummon(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-right bg-white text-slate-900" id="printable-bursar-summon">
              {/* Official Algerian Letterhead */}
              <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                <p className="text-xs font-bold text-slate-600">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                <p className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - مديرية التربية لولاية غليزان</p>
                <h3 className="text-base font-black text-slate-900">{SCHOOL_NAME}</h3>
                <p className="text-xs font-bold text-teal-800">مصلحة الاقتصاد والتسيير المالي والمادي</p>
                <div className="inline-block bg-teal-900 text-white px-5 py-1 rounded-full text-xs font-black mt-2">
                  استدعاء داخلي / أمر بتكليف بمهمة
                </div>
              </div>

              {/* Summon Details */}
              <div className="space-y-4 text-xs leading-relaxed">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">المعني بالاستدعاء:</span>
                    <strong className="text-sm text-slate-900">{previewSummon.targetStaffName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">الرتبة والوظيفة:</span>
                    <span className="font-bold text-slate-800">{previewSummon.targetStaffRank || 'عامل مهني'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">موضوع المهمة:</span>
                    <strong className="text-teal-900">{previewSummon.reason}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">التاريخ والموعد:</span>
                    <span className="font-bold text-slate-800">
                      يوم <strong>{previewSummon.appointmentDate}</strong> على الساعة <strong>{previewSummon.appointmentTime}</strong>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">المكان:</span>
                    <span className="font-bold text-slate-800">{previewSummon.location || 'مكتب المقتصدة'}</span>
                  </div>
                </div>

                {previewSummon.reasonDetails && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950">
                    <strong>ملاحظات وتعليمات العمل:</strong> {previewSummon.reasonDetails}
                  </div>
                )}

                <p className="text-[11px] text-slate-600 text-justify">
                  يُرجى من السيد(ة) المعني(ة) الحضور في الوقت والمكان المحددين أعلاه لأداء المهمة المسندة له في إطار الصالح العام للمؤسسة.
                </p>
              </div>

              {/* Signatures */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-300 text-xs">
                <div className="text-center w-40">
                  <span className="text-slate-500 block mb-1">توقيع المعني بالاستلام:</span>
                  <div className="h-10 border-b border-dashed border-slate-400" />
                </div>

                <div className="text-center w-48">
                  <span className="text-slate-500 block mb-1">المقتصدة:</span>
                  <div className="p-2 border border-teal-300 rounded-xl bg-teal-50 text-[11px] font-bold text-teal-950">
                    مكي حفيظة
                    <br />
                    <span className="text-[9px] text-teal-700">ختم وتوقيع المصالح الاقتصادية</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
