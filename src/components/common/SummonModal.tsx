import React from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  Printer,
  Shield,
  User,
  X,
} from 'lucide-react';
import { SCHOOL_FULL_HEADER, SCHOOL_NAME } from '../../data/mockData';
import {
  formatWhatsAppSummonMessage,
  openWhatsAppSummon,
  updateSummonStatus,
} from '../../services/storageService';
import { ParentSummon, UserProfile } from '../../types';

interface SummonModalProps {
  summon: ParentSummon | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const SummonModal: React.FC<SummonModalProps> = ({
  summon,
  currentUser,
  onClose,
  onStatusUpdated,
}) => {
  if (!summon) return null;

  const reasonLabels: Record<string, string> = {
    absence: 'غيابات متكررة وتأخرات غير مبررة',
    discipline: 'متابعة السلوك والانضباط المدرسي',
    grades: 'مناقشة النتائج والمستوى التحصيلي',
    admin: 'أمر إداري مستعجل يخص التلميذ(ة)',
    report_card: 'استلام كشف النقاط والملاحظات التوجيهية',
    other: 'أمر تربوي وإداري هام',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    openWhatsAppSummon(summon);
    if (summon.status === 'sent') {
      updateSummonStatus(summon.id, 'sent');
      if (onStatusUpdated) onStatusUpdated();
    }
  };

  const handleMarkAttended = () => {
    updateSummonStatus(summon.id, 'attended');
    if (onStatusUpdated) onStatusUpdated();
  };

  const whatsappMessagePreview = formatWhatsAppSummonMessage(summon);

  const canManage =
    currentUser && (currentUser.role === 'censor' || currentUser.role === 'director');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Top Bar (hidden on print) */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">وصل استدعاء ولي أمر تلميذ</h2>
              <p className="text-xs text-emerald-200">
                مكتب الناظر / مستشارية التربية - {SCHOOL_NAME}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Official Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-8" id="printable-summon">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-emerald-900/20 pb-4">
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              وزارة التربية الوطنية - مديرية التربية لولاية الشلف
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold text-emerald-900 mt-2">
              {SCHOOL_NAME}
            </h1>
            <div className="inline-block bg-emerald-100 text-emerald-900 border border-emerald-300 px-4 py-1 rounded-full text-xs font-bold mt-2">
              استدعاء رسمي لولي الأمر (رقم: {summon.id.slice(-6)})
            </div>
          </div>

          {/* Student & Guardian Info Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">اسم ولقب التلميذ(ة):</span>
                <span className="font-bold text-slate-900 text-base">{summon.studentName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">القسم والفوج:</span>
                <span className="font-bold text-emerald-800 text-base">{summon.studentClass}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">اسم الولي / الوصي الشرعي:</span>
                <span className="font-bold text-slate-900">{summon.guardianName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">رقم هاتف الولي (واتساب):</span>
                <span className="font-bold text-slate-900 font-mono" dir="ltr">
                  {summon.guardianPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Reason & Appointment */}
          <div className="space-y-4">
            <div className="border border-amber-200 bg-amber-50/60 rounded-2xl p-4">
              <span className="text-xs font-bold text-amber-900 block mb-1">سبب الاستدعاء:</span>
              <p className="font-bold text-amber-950 text-base mb-1">
                {reasonLabels[summon.reason] || summon.reason}
              </p>
              {summon.reasonDetails && (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2 pt-2 border-t border-amber-200/60">
                  {summon.reasonDetails}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs text-emerald-800 block">تاريخ الموعد:</span>
                  <span className="font-bold text-emerald-950">{summon.appointmentDate}</span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs text-emerald-800 block">توقيت الحضور:</span>
                  <span className="font-bold text-emerald-950">{summon.appointmentTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stamp & Signature Section */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
            <div className="text-slate-600">
              <p>حرر بـ: الشلف، في {new Date(summon.issuedAt).toLocaleDateString('ar-DZ')}</p>
              <p className="font-semibold text-slate-800 mt-1">المحرر: {summon.issuedBy}</p>
            </div>

            <div className="text-center border-2 border-dashed border-emerald-800/40 rounded-2xl p-3 bg-emerald-50/30 w-36">
              <div className="text-[10px] text-emerald-900 font-bold mb-4">
                ختم الإدارة وتأشيرة الناظر
              </div>
              <div className="w-14 h-14 mx-auto rounded-full border-2 border-emerald-700 flex items-center justify-center text-[9px] text-emerald-800 font-bold text-center leading-tight">
                متوسطة بن نعمة
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Action Preview (Hidden on print) */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 print:hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>إرسال استدعاء رسمي إلى هاتف الولي عبر واتساب</span>
              </div>
              <span className="text-xs text-emerald-700 font-mono">{summon.guardianPhone}</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              بالنقر على الزر أدناه، يتم فتح تطبيق واتساب مباشرة مع رسالة رسمية منسقة ببيانات التلميذ والموعد المحدد دون الحاجة لكتابتها يدوياً.
            </p>
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-transform active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>إرسال الاستدعاء عبر واتساب الآن</span>
              <ExternalLink className="w-4 h-4 mr-1 opacity-70" />
            </button>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة الوصل</span>
            </button>

            {canManage && summon.status !== 'attended' && (
              <button
                onClick={handleMarkAttended}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold text-xs sm:text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تسجيل حضور الولي</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs sm:text-sm transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
