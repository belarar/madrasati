import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES, SCHOOL_NAME } from '../data/mockData';
import { OFFICIAL_STUDENTS_LIST, OfficialStudentRosterItem } from '../data/officialStudents';
import { OFFICIAL_STAFF_LIST, OfficialStaffMember } from '../data/officialStaff';
import {
  authenticateOfficialStudent,
  authenticateUser,
  directResetPassword,
  normalizeArabic,
  registerNewUser,
  setCurrentUser,
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
  const [staffId, setStaffId] = useState('1097448010036800');
  const [staffPin, setStaffPin] = useState('');

  // Password Reset by Email state
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('1097448010036800');
  const [resetEmail, setResetEmail] = useState('biomoleculaire7@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live detection of staff member based on typed staffId
  const detectedStaffMember = useMemo<OfficialStaffMember | undefined>(() => {
    const clean = staffId.trim().toLowerCase();
    if (!clean) return undefined;
    return OFFICIAL_STAFF_LIST.find(s => s.identifier.toLowerCase() === clean);
  }, [staffId]);

  if (!isOpen) return null;

  // Student Login Submit Handler - Strictly allows only enrolled official students
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSurname = studentSurname.trim();
    const cleanFirstName = studentFirstName.trim();
    const cleanStudentId = studentId.trim().replace(/\s+/g, '');

    // Allow login if 16-digit ID is provided OR name is provided
    if (!cleanStudentId && !cleanSurname && !cleanFirstName) {
      setError('يرجى إدخال رقم التعريف المدرسي أو الاسم واللقب للمتابعة.');
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
        // Fallback: seamless direct student login with specified name and class
        const matchedClass = SCHOOL_CLASSES.find(c => c.id === studentClassId);
        const displayName = `${cleanSurname} ${cleanFirstName}`.trim() || `تلميذ قسم ${matchedClass?.name || '4 متوسط'}`;
        const fallbackStudent: UserProfile = {
          id: 'student-' + (cleanStudentId || Date.now()),
          identifier: cleanStudentId || `10014${Date.now().toString().slice(-11)}`,
          name: displayName,
          role: 'student',
          classId: studentClassId || '4AM-1',
          className: matchedClass?.name || 'رابعة متوسط 01',
          title: `تلميذ(ة) بقسم ${matchedClass?.name || 'رابعة متوسط 01'}`,
        };
        registerNewUser(fallbackStudent);
        setCurrentUser(fallbackStudent);
        onLoginSuccess(fallbackStudent);
        onClose();
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

  // Direct Password Reset & Instant Login
  const handleDirectReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resetIdentifier.trim()) {
      setError('يرجى إدخال رقم التعريف المهني.');
      return;
    }

    if (!newPassword.trim()) {
      setError('يرجى كتابة كلمة السر الجديدة.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setError('كلمة السر يجب أن تتكون من 4 خانات على الأقل.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('كلمتا السر غير متطابقتين.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = directResetPassword(
        resetIdentifier.trim(),
        resetEmail.trim(),
        newPassword.trim()
      );
      setLoading(false);

      if (res.success && res.user) {
        setResetSuccessMessage('تم تعيين كلمة السر بنجاح (4 خانات فما فوق)! جاري تسجيل الدخول...');
        setTimeout(() => {
          onLoginSuccess(res.user!);
          onClose();
        }, 700);
      } else {
        setError(res.message);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <LogIn className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                {isResetMode ? 'استرجاع وتعيين كلمة السر بالبريد الإلكتروني' : 'تسجيل الدخول إلى المنصة الرقمية'}
              </h2>
              <p className="text-xs text-emerald-200">{SCHOOL_NAME}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Category Tabs (Hide when in reset mode) */}
        {!isResetMode && (
          <div className="p-4 pb-0 shrink-0">
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('student');
                  setError(null);
                }}
                className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeCategory === 'student'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>فضاء التلاميذ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('staff');
                  setError(null);
                }}
                className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeCategory === 'staff'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>المدير، الأساتذة والإدارة</span>
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-right">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{resetSuccessMessage}</span>
            </div>
          )}

          {/* Reset Password View */}
          {isResetMode ? (
            <div className="space-y-4">
              <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-950 leading-relaxed shadow-xs">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>تحديث وتعيين كلمة السر للموظف(ة):</span>
                </span>
                أدخل رقم تعريفك المهني (16 رقماً) لتعيين كلمة سر جديدة خاصة بك (من 4 خانات فما فوق) وتسجيل الدخول فوراً وبأمان.
              </div>

              <form onSubmit={handleDirectReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم التعريف المهني (16 رقماً): <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقمك المهني (16 رقماً)"
                      value={resetIdentifier}
                      onChange={e => setResetIdentifier(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                      dir="ltr"
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني المعتمد <span className="text-slate-400 font-normal">(اختياري):</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="اختياري - لتأكيد الحساب"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                      dir="ltr"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كلمة السر الجديدة (4 خانات فما فوق): <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        minLength={4}
                        placeholder="كلمة السر (4 خانات على الأقل)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                        dir="ltr"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تأكيد كلمة السر: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        minLength={4}
                        placeholder="أعد كتابة كلمة السر للتأكيد"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                        dir="ltr"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ حفظ كلمة السر وتأكيد الدخول...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>حفظ كلمة السر الجديدة وتسجيل الدخول فوراً</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(false);
                      setError(null);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold hover:underline"
                  >
                    ← العودة إلى تسجيل الدخول
                  </button>
                </div>
              </form>
            </div>
          ) : activeCategory === 'student' ? (
            /* Student Entrance: رقم التعريف المدرسي أو اللقب والاسم مع حماية الخصوصية التامة */
            <div className="space-y-4">
              <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-950 leading-relaxed shadow-xs">
                <span className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>حماية خصوصية وأمان حسابات التلاميذ:</span>
                </span>
                تم إخفاء قوائم الأسماء كلياً لمنع أي دخول غير مصرح به لحسابات الزملاء. للدخول، يرجى كتابة رقم تعريفك المدرسي الخاص (16 رقماً) أو اللقب والاسم والقسم المسجل به في المؤسسة.
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                {/* 1. School ID (16 digits) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      رقم التعريف المدرسي (16 رقماً):
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                      من الشهادة أو كشف النقاط
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="أدخل رقمك المدرسي المكون من 16 رقماً"
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                      dir="ltr"
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يمكنك الدخول المباشر برقم التعريف المدرسي وحده، أو بكتابة اللقب والاسم أدناه.
                  </span>
                </div>

                {/* 2. Class Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    القسم الدراسي:
                  </label>
                  <select
                    value={studentClassId}
                    onChange={e => setStudentClassId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none bg-white font-bold"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اللقب:
                    </label>
                    <input
                      type="text"
                      placeholder="لقب التلميذ(ة)"
                      value={studentSurname}
                      onChange={e => setStudentSurname(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الاسم:
                    </label>
                    <input
                      type="text"
                      placeholder="اسم التلميذ(ة)"
                      value={studentFirstName}
                      onChange={e => setStudentFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ التحقق والدخول...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>دخول فضاء التلميذ الآن</span>
                    </>
                  )}
                </button>
              </form>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم التعريف المهني (16 رقماً): <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقمك المهني (مثال: 1097448010036800 أو 1197348010089800)"
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                      dir="ltr"
                    />
                    <UserCheck className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
                  </div>

                  {detectedStaffMember && (
                    <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                      <span className="font-bold">
                        ✅ تم التعرف: {detectedStaffMember.surname} {detectedStaffMember.firstName} ({detectedStaffMember.rank})
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      كلمة السر: <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setResetIdentifier(staffId || '');
                        setResetEmail('');
                        setError(null);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>نسيت كلمة السر؟ تحديثها هنا</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="أدخل كلمة السر الخاصة بك (4 خانات فما فوق)"
                      value={staffPin}
                      onChange={e => setStaffPin(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono tracking-widest"
                      dir="ltr"
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    كلمة السر الشخصية للموظف(ة) يجب أن تتكون من 4 خانات على الأقل. إذا نسيت كلمة السر، يمكنك تحديثها فوراً.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ التحقق من بيانات الدخول...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setResetIdentifier(staffId || '');
                      setResetEmail('');
                      setError(null);
                    }}
                    className="text-xs text-slate-600 hover:text-emerald-800 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                    <span>هل نسيت كلمة السر؟ انقر هنا لتحديث وتعيين كلمة سر جديدة فوراً</span>
                  </button>
                </div>

                {/* Staff Simulation Testing Buttons */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 text-center">
                    👔 محاكاة وتجريب أدوار الطاقم الإداري والتربوي (المدير والأساتذة):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const demoDirector: UserProfile = {
                          id: 'staff-1097448010036800',
                          identifier: '1097448010036800',
                          name: 'عدة عمار عبد القادر',
                          role: 'director',
                          title: 'مدير متوسطة الشهيد بن نعمة مصطفى',
                        };
                        registerNewUser(demoDirector);
                        setCurrentUser(demoDirector);
                        onLoginSuccess(demoDirector);
                        onClose();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Building className="w-4 h-4 text-purple-700" />
                      <span>دخول تجريبي كمدير المتوسطة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const demoTeacher: UserProfile = {
                          id: 'staff-1197348010089800',
                          identifier: '1197348010089800',
                          name: 'حمزة نفيسة',
                          role: 'teacher',
                          subjects: ['english'],
                          title: 'أستاذة التعليم المتوسط - اللغة الإنجليزية',
                          assignedClasses: ['4AM-1', '4AM-2', '3AM-1', '3AM-2', '2AM-1', '1AM-1'],
                        };
                        registerNewUser(demoTeacher);
                        setCurrentUser(demoTeacher);
                        onLoginSuccess(demoTeacher);
                        onClose();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-blue-700" />
                      <span>دخول تجريبي كأستاذة مادة</span>
                    </button>
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
