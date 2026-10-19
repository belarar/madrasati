import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Coins,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  Shield,
  ShieldAlert,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES, SCHOOL_NAME } from '../data/mockData';
import { OFFICIAL_STAFF_LIST } from '../data/officialStaff';
import {
  authenticateOfficialStudent,
  authenticateUser,
  submitPasswordResetRequest,
} from '../services/storageService';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeCategory, setActiveCategory] = useState<'student' | 'staff'>('student');

  // Student Form Fields
  const [studentSurname, setStudentSurname] = useState('');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentClassId, setStudentClassId] = useState('4AM-1');
  const [studentId, setStudentId] = useState('');

  // Staff Form Fields: الرقم المهني + كلمة السر
  const [staffId, setStaffId] = useState('');
  const [staffPin, setStaffPin] = useState('');

  // Password Reset Mode Fields (Staff requests reset -> Director must approve)
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStaffId, setResetStaffId] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [showResetPin, setShowResetPin] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Student Login Submit Handler - Strictly enforces 16-digit ID + matching Name
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSurname = studentSurname.trim();
    const cleanFirstName = studentFirstName.trim();
    const cleanStudentId = studentId.trim().replace(/\s+/g, '');

    // Strictly enforce both credentials
    if (!cleanStudentId) {
      setError('يرجى إدخال رقم التعريف المدرسي المكون من 16 رقماً الخاص بك.');
      return;
    }

    if (!cleanSurname || !cleanFirstName) {
      setError('يرجى إدخال اللقب والاسم معاً لتأكيد هويتك ومنع دخول أي تلميذ آخر في حسابك.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = authenticateOfficialStudent({
        identifier: cleanStudentId,
        surname: cleanSurname,
        firstName: cleanFirstName,
        classId: studentClassId,
      });

      setLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(res.message || 'بيانات الدخول غير صحيحة أو غير متطابقة مع سجلات المؤسسة.');
      }
    }, 250);
  };

  // Staff Login Submit Handler - Strictly allows only registered official staff
  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanStaffId = staffId.trim();
    if (!cleanStaffId) {
      setError('يرجى إدخال رقم التعريف المهني.');
      return;
    }

    if (!staffPin.trim()) {
      setError('يرجى إدخال كلمة السر الخاصة بك.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = authenticateUser(cleanStaffId, staffPin.trim());
      setLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(
          res.message ||
            '⛔ رقم التعريف المهني غير مسجل في قائمة موظفي المؤسسة، أو كلمة السر غير صحيحة.'
        );
      }
    }, 250);
  };

  // Staff Password Reset Submit Handler (Requests reset which requires director approval)
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);

    const cleanId = resetStaffId.trim();
    if (!cleanId) {
      setResetFeedback({ type: 'error', message: 'يرجى إدخال رقم التعريف المهني المكون من 16 رقماً.' });
      return;
    }

    if (resetNewPin.trim().length < 4) {
      setResetFeedback({ type: 'error', message: 'كلمة السر الجديدة يجب أن تتكون من 4 خانات على الأقل.' });
      return;
    }

    if (resetNewPin.trim() !== resetConfirmPin.trim()) {
      setResetFeedback({ type: 'error', message: 'كلمة السر غير متطابقة مع خانة التأكيد، يرجى كتابتها بدقة.' });
      return;
    }

    setIsSubmittingReset(true);
    const res = await submitPasswordResetRequest(cleanId, resetNewPin.trim(), resetNote.trim());
    setIsSubmittingReset(false);

    if (res.success) {
      setResetFeedback({
        type: 'success',
        message: 'تم إرسال طلب إعادة تعيين كلمة السر بنجاح إلى السيد المدير!',
      });
    } else {
      setResetFeedback({ type: 'error', message: res.message });
    }
  };

  const detectedStaff = resetStaffId.trim()
    ? OFFICIAL_STAFF_LIST.find(s => s.identifier === resetStaffId.trim())
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div
          style={{ backgroundColor: '#064e3b', color: '#ffffff' }}
          className="bg-emerald-900 text-white p-5 flex items-center justify-between shrink-0 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner">
              <LogIn className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2
                style={{ color: '#ffffff', fontWeight: 900 }}
                className="font-black text-base sm:text-lg text-white"
              >
                تسجيل الدخول إلى المنصة الرقمية
              </h2>
              <p
                style={{ color: '#fef08a', fontWeight: 700 }}
                className="text-xs text-yellow-200 font-bold"
              >
                {SCHOOL_NAME}
              </p>
            </div>
          </div>
          {/* Prominent Red Exit Button */}
          <button
            onClick={onClose}
            type="button"
            style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white border-2 border-red-400 transition-all shadow-md cursor-pointer group active:scale-95"
            title="خروج وإغلاق النافذة"
          >
            <div className="w-5 h-5 rounded-lg bg-black/20 flex items-center justify-center">
              <X className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <span
              style={{ color: '#ffffff', fontWeight: 900 }}
              className="text-xs font-black text-white"
            >
              خروج
            </span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="p-4 pb-0 shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('student');
                setError(null);
              }}
              style={{
                backgroundColor: activeCategory === 'student' ? '#064e3b' : '#f8fafc',
                color: activeCategory === 'student' ? '#fef08a' : '#0f172a',
              }}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer border ${
                activeCategory === 'student'
                  ? 'border-emerald-700 shadow-md font-black'
                  : 'border-slate-300 hover:bg-white text-slate-900 font-bold'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  activeCategory === 'student'
                    ? 'bg-yellow-400 text-emerald-950'
                    : 'bg-slate-300 text-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span
                style={{
                  color: activeCategory === 'student' ? '#fef08a' : '#0f172a',
                  fontWeight: 900,
                  fontSize: '13px',
                }}
              >
                فضاء التلاميذ
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('staff');
                setError(null);
              }}
              style={{
                backgroundColor: activeCategory === 'staff' ? '#064e3b' : '#f8fafc',
                color: activeCategory === 'staff' ? '#fef08a' : '#0f172a',
              }}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer border ${
                activeCategory === 'staff'
                  ? 'border-emerald-700 shadow-md font-black'
                  : 'border-slate-300 hover:bg-white text-slate-900 font-bold'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  activeCategory === 'staff'
                    ? 'bg-yellow-400 text-emerald-950'
                    : 'bg-slate-300 text-slate-800'
                }`}
              >
                <Building className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span
                style={{
                  color: activeCategory === 'staff' ? '#fef08a' : '#0f172a',
                  fontWeight: 900,
                  fontSize: '13px',
                }}
              >
                المدير، الأساتذة والإدارة
              </span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-right">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {activeCategory === 'student' ? (
            /* Student Entrance */
            <div className="space-y-4">
              <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-950 leading-relaxed shadow-xs">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>دخول آمن ومحمي لتلاميذ المؤسسة (الرقم المدرسي + اللقب والاسم):</span>
                </span>
                لحماية حسابك ومنع أي تلميذ آخر من الدخول في حسابك، يُشترط النظام إدخال <strong>رقم تعريفك المدرسي (16 رقماً)</strong> مع <strong>اللقب والاسم</strong> وتطابقهما معاً كما في الشهادة المدرسية أو كشف النقاط.
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                {/* 1. School ID (16 digits) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label style={{ color: '#0f172a', fontWeight: 900 }} className="text-xs font-black text-slate-900">
                      رقم التعريف المدرسي (16 رقماً): <span className="text-red-600 font-black">* إلزامي</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-400">
                      من الشهادة أو كشف النقاط
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقمك المدرسي المكون من 16 رقماً"
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold text-sm outline-none font-mono bg-white"
                      dir="ltr"
                    />
                    <UserCheck className="w-4 h-4 text-emerald-700 absolute right-3 top-3.5" />
                  </div>
                  <span style={{ color: '#475569' }} className="text-[10px] text-slate-600 font-medium mt-1 block">
                    يضمن عدم تمكن أي زميل آخر من الدخول إلى حسابك.
                  </span>
                </div>

                {/* 2. Class Selection */}
                <div>
                  <label style={{ color: '#0f172a', fontWeight: 900 }} className="block text-xs font-black text-slate-900 mb-1">
                    القسم الدراسي:
                  </label>
                  <select
                    value={studentClassId}
                    onChange={e => setStudentClassId(e.target.value)}
                    style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white font-bold"
                  >
                    {SCHOOL_CLASSES.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Surname and First Name in 2 inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ color: '#0f172a', fontWeight: 900 }} className="block text-xs font-black text-slate-900 mb-1">
                      اللقب: <span className="text-red-600 font-black">* إلزامي</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="لقب التلميذ(ة)"
                      value={studentSurname}
                      onChange={e => setStudentSurname(e.target.value)}
                      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold text-sm outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label style={{ color: '#0f172a', fontWeight: 900 }} className="block text-xs font-black text-slate-900 mb-1">
                      الاسم: <span className="text-red-600 font-black">* إلزامي</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="اسم التلميذ(ة)"
                      value={studentFirstName}
                      onChange={e => setStudentFirstName(e.target.value)}
                      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold text-sm outline-none bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#fef08a',
                    borderColor: '#10b981',
                  }}
                  className="w-full py-4 px-5 rounded-2xl bg-emerald-900 hover:bg-emerald-950 active:scale-98 text-yellow-300 font-extrabold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mt-3 cursor-pointer border-2 border-emerald-500"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
                      <span style={{ color: '#fef08a', fontWeight: 900 }}>جارٍ التحقق والدخول إلى الفضاء...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-yellow-400 text-emerald-950 flex items-center justify-center shrink-0 shadow-md">
                        <GraduationCap className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <span
                        style={{
                          color: '#fef08a',
                          fontWeight: 900,
                          fontSize: '17px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        }}
                        className="text-yellow-200 font-black tracking-wide"
                      >
                        دخول فضاء التلميذ الآن
                      </span>
                      <ArrowRight className="w-5 h-5 text-yellow-300 rtl:rotate-180 stroke-[2.5]" />
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    تجربة سريعة لحساب تلميذ مسجل رسمياً:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentClassId('4AM-1');
                      setStudentSurname('بن نعمة');
                      setStudentFirstName('محمد');
                      setStudentId('2010480100340001');
                    }}
                    className="w-full p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>ملء بيانات تلميذ: بن نعمة محمد (4 متوسط 1)</span>
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>
              </form>
            </div>
          ) : isResetMode ? (
            /* Staff Password Reset Request Mode - Strictly requires Director approval to activate */
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 leading-relaxed space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950 text-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>طلب إعادة تعيين وتفعيل كلمة السر:</span>
                </div>
                <p>
                  لحماية حسابك ومنع أي اختراق، يمكنك إدخال كلمة سر جديدة لطلب تفعيلها، <strong className="underline text-amber-950 font-black">ولن تتمكن من الدخول حتى يقوم السيد المدير شخصياً بالموافقة على الطلب وتفعيله</strong> من لوحة التحكم الخاصة به.
                </p>
              </div>

              {resetFeedback ? (
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed space-y-3 ${
                    resetFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {resetFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-2">
                      <p className="font-bold text-sm">{resetFeedback.message}</p>
                      {resetFeedback.type === 'success' && (
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 space-y-1 text-slate-700">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <Clock className="w-4 h-4" />
                            <span>حالة الحساب: معلق ومحمي في انتظار مصادقة السيد المدير</span>
                          </div>
                          <p>
                            لن يتم تفعيل الدخول بكلمة السر الجديدة إلا بعد أن يوافق السيد المدير على طلبك رسمياً. يرجى مراجعة الإدارة لتفعيل الدخول.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setResetFeedback(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>العودة لصفحة تسجيل الدخول</span>
                    </button>
                    {resetFeedback.type === 'error' && (
                      <button
                        type="button"
                        onClick={() => setResetFeedback(null)}
                        className="py-2.5 px-4 rounded-xl bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold text-xs transition-all cursor-pointer"
                      >
                        إعادة المحاولة
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم التعريف المهني (16 رقماً): <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="أدخل رقمك المهني المكون من 16 رقماً"
                        value={resetStaffId}
                        onChange={e => setResetStaffId(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                        dir="ltr"
                      />
                      <UserCheck className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    </div>

                    {detectedStaff && (
                      <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          موظف رسمي: {detectedStaff.surname} {detectedStaff.firstName} ({detectedStaff.rank} {detectedStaff.subjectName ? `- ${detectedStaff.subjectName}` : ''})
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كلمة السر الجديدة المطلوبة (4 خانات فما فوق): <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPin ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="اختر كلمة سر جديدة لحسابك"
                        value={resetNewPin}
                        onChange={e => setResetNewPin(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono tracking-wider"
                        dir="ltr"
                      />
                      <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowResetPin(!showResetPin)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showResetPin ? 'إخفاء' : 'إظهار'}
                      >
                        {showResetPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تأكيد كلمة السر الجديدة: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPin ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="أعد إدخال كلمة السر للتأكيد"
                        value={resetConfirmPin}
                        onChange={e => setResetConfirmPin(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono tracking-wider"
                        dir="ltr"
                      />
                      <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملاحظة أو سبب الطلب للإدارة (اختياري):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: نسيت كلمة السر القديمة / أرجو تفعيل حسابي"
                      value={resetNote}
                      onChange={e => setResetNote(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-xs outline-none"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmittingReset}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmittingReset ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جارٍ إرسال الطلب للمدير...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>إرسال طلب التفعيل إلى السيد المدير</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setResetFeedback(null);
                      }}
                      className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>إلغاء والعودة لتسجيل الدخول</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Staff & Director Entrance: Professional ID + Password */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs text-slate-700 leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-slate-900">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>دخول الطاقم الإداري والتربوي:</span>
                </span>
                يرجى إدخال رقم التعريف المهني المخصص لك مع كلمة السر الخاصة بحسابك للمتابعة.
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div>
                  <label style={{ color: '#0f172a', fontWeight: 900 }} className="block text-xs font-black text-slate-900 mb-1.5">
                    رقم التعريف المهني (16 رقماً): <span className="text-red-600 font-black">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقمك المهني المكون من 16 رقماً"
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold text-sm outline-none font-mono bg-white"
                      dir="ltr"
                    />
                    <UserCheck className="w-5 h-5 text-emerald-700 absolute right-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label style={{ color: '#0f172a', fontWeight: 900 }} className="block text-xs font-black text-slate-900">
                      كلمة السر: <span className="text-red-600 font-black">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setResetStaffId(staffId.trim());
                        setResetFeedback(null);
                        setError(null);
                      }}
                      style={{ color: '#047857' }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>نسيت كلمة السر؟ طلب تعيين وتفعيل</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="أدخل كلمة السر الخاصة بك"
                      value={staffPin}
                      onChange={e => setStaffPin(e.target.value)}
                      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-bold text-sm outline-none font-mono tracking-widest bg-white"
                      dir="ltr"
                    />
                    <Lock className="w-5 h-5 text-emerald-700 absolute right-3 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#fef08a',
                    borderColor: '#10b981',
                  }}
                  className="w-full py-4 px-5 rounded-2xl bg-emerald-900 hover:bg-emerald-950 active:scale-98 text-yellow-300 font-extrabold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mt-3 cursor-pointer border-2 border-emerald-500"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
                      <span style={{ color: '#fef08a', fontWeight: 900 }}>جارٍ التحقق من بيانات الدخول...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-yellow-400 text-emerald-950 flex items-center justify-center shrink-0 shadow-md">
                        <LogIn className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <span
                        style={{
                          color: '#fef08a',
                          fontWeight: 900,
                          fontSize: '17px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        }}
                        className="text-yellow-200 font-black tracking-wide"
                      >
                        تسجيل الدخول إلى حسابي
                      </span>
                      <ArrowRight className="w-5 h-5 text-yellow-300 rtl:rotate-180 stroke-[2.5]" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block mb-2">
                    حسابات رسمية سريعة للمعاينة والتجربة:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStaffId('1097448010036800');
                        setStaffPin('1234');
                      }}
                      className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 font-bold border border-purple-200 text-right flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="block font-black">المدير: عدة عمار</span>
                        <span className="text-[10px] text-purple-700 font-normal">إدارة وتفعيل الحسابات</span>
                      </div>
                      <Building className="w-4 h-4 text-purple-700 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffId('1198044010190200');
                        setStaffPin('1234');
                      }}
                      className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold border border-teal-200 text-right flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="block font-black">الناظرة: شقايبل نعيمة</span>
                        <span className="text-[10px] text-teal-700 font-normal">المشرفون والتلاميذ</span>
                      </div>
                      <Shield className="w-4 h-4 text-teal-700 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffId('1197748280037000');
                        setStaffPin('1234');
                      }}
                      className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 text-right flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="block font-black">المقتصدة: مكي حفيظة</span>
                        <span className="text-[10px] text-emerald-700 font-normal">إسناد واستدعاء العمال</span>
                      </div>
                      <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffId('1098429340019200');
                        setStaffPin('1234');
                      }}
                      className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold border border-blue-200 text-right flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="block font-black">أستاذ: العربي بن حجار</span>
                        <span className="text-[10px] text-blue-700 font-normal">أستاذ الرياضيات (4م)</span>
                      </div>
                      <User className="w-4 h-4 text-blue-700 shrink-0" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block mb-0.5">بروتوكول حماية الحسابات من الاختراق:</span>
                    في حالة نسيان كلمة السر، يمكنك تقديم طلب تعيين كلمة سر جديدة. لحماية حسابك، لن يتمكن أي شخص من الدخول حتى يوافق السيد المدير شخصياً على الطلب ويفعّله من لوحة التحكم.
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
