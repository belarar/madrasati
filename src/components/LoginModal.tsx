import React, { useState } from 'react';
import {
  AlertCircle,
  Building,
  GraduationCap,
  Lock,
  LogIn,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES, SCHOOL_NAME } from '../data/mockData';
import {
  authenticateOfficialStudent,
  authenticateUser,
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
                تسجيل الدخول إلى المنصة الرقمية
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

        {/* Category Tabs */}
        <div className="p-4 pb-0 shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('student');
                setError(null);
              }}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                    <label className="text-xs font-bold text-slate-700">
                      رقم التعريف المدرسي (16 رقماً): <span className="text-red-500 font-black">* إلزامي</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
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
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                      dir="ltr"
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يضمن عدم تمكن أي زميل آخر من الدخول إلى حسابك.
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
                      اللقب: <span className="text-red-500 font-black">* إلزامي</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="لقب التلميذ(ة)"
                      value={studentSurname}
                      onChange={e => setStudentSurname(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الاسم: <span className="text-red-500 font-black">* إلزامي</span>
                    </label>
                    <input
                      type="text"
                      required
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
                      placeholder="أدخل رقمك المهني المكون من 16 رقماً"
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                      dir="ltr"
                    />
                    <UserCheck className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    كلمة السر: <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="أدخل كلمة السر الخاصة بك"
                      value={staffPin}
                      onChange={e => setStaffPin(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono tracking-widest"
                      dir="ltr"
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
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
                      <span>جارٍ التحقق من بيانات الدخول...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>

                <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block mb-0.5">حماية وأمان الحسابات:</span>
                    لحماية الحسابات من أي محاولة دخول غير مصرح بها، تم حظر أي استرجاع مباشر من الواجهة العامة. في حالة نسيان كلمة السر، يُرجى مراجعة إدارة المؤسسة أو السيد المدير شخصياً لإعادة ضبطها.
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
