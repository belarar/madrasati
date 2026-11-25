import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  GraduationCap,
  KeyRound,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES, SCHOOL_NAME } from '../../data/mockData';
import { addCustomStudent } from '../../services/storageService';
import { UserProfile } from '../../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded?: (student: UserProfile) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onStudentAdded,
}) => {
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('4AM-1');
  const [createdStudent, setCreatedStudent] = useState<UserProfile | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCreatedStudent(null);
    setStudentName('');
    setCopiedCode(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    const generatedInternalId = `STD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const selectedCls = SCHOOL_CLASSES.find(c => c.id === studentClass);
    const created = addCustomStudent({
      identifier: generatedInternalId,
      name: studentName.trim(),
      classId: studentClass,
      className: selectedCls?.name || 'رابعة متوسط 01',
    });

    setCreatedStudent(created);
    setCopiedCode(false);
    setStudentName('');
    if (onStudentAdded) onStudentAdded(created);
  };

  const handleCopyCode = async () => {
    if (!createdStudent?.activationCode) return;
    try {
      await navigator.clipboard.writeText(createdStudent.activationCode);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = createdStudent.activationCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleDownloadSingleSlip = () => {
    if (!createdStudent) return;
    const siteUrl =
      (typeof localStorage !== 'undefined' && localStorage.getItem('ben_naama_platform_url')) ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const esc = (v?: string) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>قصاصة دخول التلميذ - ${esc(createdStudent.name)}</title>
  <style>
    body { font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 440px; margin: 0 auto; background: #fff; border: 2px solid #047857; border-radius: 16px; padding: 20px; text-align: center; }
    .school { font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 6px; }
    .name { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
    .cls { font-size: 13px; color: #475569; font-weight: 700; margin-bottom: 14px; }
    .code-box { background: #ecfdf5; border: 1.5px dashed #059669; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
    .code-lbl { font-size: 12px; font-weight: 700; color: #065f46; margin-bottom: 4px; }
    .code-val { font-size: 28px; font-weight: 900; letter-spacing: 6px; font-family: monospace; color: #064e3b; }
    .url-box { background: #f1f5f9; border-radius: 10px; padding: 10px; font-size: 12px; color: #0f172a; margin-bottom: 10px; }
    .url-val { font-family: monospace; font-weight: 700; word-break: break-all; margin-top: 3px; color: #047857; }
    .hint { font-size: 11px; color: #64748b; margin-top: 8px; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="school">${esc(SCHOOL_NAME)}</div>
    <div class="name">${esc(createdStudent.name)}</div>
    <div class="cls">القسم: ${esc(createdStudent.className)}</div>
    <div class="code-box">
      <div class="code-lbl">رمز التفعيل الشخصي (6 أرقام):</div>
      <div class="code-val" dir="ltr">${esc(createdStudent.activationCode)}</div>
    </div>
    ${
      siteUrl
        ? `<div class="url-box">
            <div>رابط الدخول إلى المنصة:</div>
            <div class="url-val" dir="ltr">${esc(siteUrl)}</div>
          </div>`
        : ''
    }
    <div class="hint">افتح الرابط ← اختر «فضاء التلاميذ» ← أدخل رمز التفعيل أعلاه</div>
  </div>
</body>
</html>`;

    const blob = new Blob(['\uFEFF' + html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `قصاصة_${createdStudent.name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-black text-base">إضافة تلميذ جديد وإصدار رمز تفعيل</h3>
              <p className="text-[11px] text-emerald-100">
                توليد رمز سري من 6 أرقام متزامن على جميع الأجهزة فوراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdStudent ? (
          <div className="p-6 space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black">
                <CheckCircle2 className="w-4 h-4" />
                <span>تمت إضافة التلميذ وتفعيل رمزه بنجاح!</span>
              </div>

              <div>
                <p className="text-base font-black text-slate-900">{createdStudent.name}</p>
                <p className="text-xs font-bold text-emerald-800">{createdStudent.className}</p>
              </div>

              <div className="bg-white border-2 border-dashed border-emerald-400 rounded-2xl py-3 px-4">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  رمز التفعيل الخاص بالدخول (6 أرقام):
                </span>
                <span
                  className="text-3xl font-black font-mono tracking-[0.25em] text-emerald-900 block"
                  dir="ltr"
                >
                  {createdStudent.activationCode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تم نسخ الرمز ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-yellow-300" />
                    <span>نسخ رمز التفعيل</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadSingleSlip}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل قصاصة التلميذ</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCreatedStudent(null);
                  setCopiedCode(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تلميذ آخر</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 space-y-1 leading-relaxed">
              <div className="font-black flex items-center gap-1.5 text-emerald-900">
                <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>كيف تضيف تلميذاً وتمنحه رمز التفعيل؟</span>
              </div>
              <p className="text-[11px] text-slate-700">
                1. أدخل اللقب والاسم واختر القسم. 2. اضغط زر الإضافة ليولّد النظام رمز تفعيل فريداً من 6 أرقام. 3. انسخ الرمز أو حمّل قصاصة التلميذ لتسليمها له.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اللقب والاسم الكامل للتلميذ(ة): <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: بن علي أمين"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                القسم والفوج الدراسي: <span className="text-red-500">*</span>
              </label>
              <select
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-sm bg-white"
              >
                {SCHOOL_CLASSES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>إضافة التلميذ وتوليد رمز التفعيل</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
