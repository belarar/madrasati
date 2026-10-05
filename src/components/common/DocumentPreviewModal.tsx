import React from 'react';
import {
  Calendar,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Presentation,
  Share2,
  User,
  X,
} from 'lucide-react';
import { SCHOOL_NAME, SUBJECTS } from '../../data/mockData';
import { downloadFile } from '../../services/storageService';
import { SchoolDocument } from '../../types';

interface DocumentPreviewModalProps {
  doc: SchoolDocument | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  const subjectInfo = SUBJECTS.find(s => s.id === doc.subject);

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />;
      case 'docx':
      case 'doc':
        return <FileCheck className="w-8 h-8 text-blue-600" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-8 h-8 text-amber-600" />;
      default:
        return <FileText className="w-8 h-8 text-slate-600" />;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: doc.title,
        text: `وثيقة تعليمية من ${SCHOOL_NAME}: ${doc.title} - الأستاذ ${doc.authorName}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${doc.title} - ${SCHOOL_NAME}\n${window.location.href}`);
      alert('تم نسخ رابط الوثيقة إلى الحافظة!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              {getFormatIcon(doc.fileFormat)}
            </div>
            <div>
              <span className="text-xs bg-emerald-700/80 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/40">
                {subjectInfo?.name || 'مادة تعليمية'}
              </span>
              <h2 className="text-lg font-bold text-white mt-1 line-clamp-1">
                معاينة الوثيقة المدرسية
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Title & Description */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug mb-3">
              {doc.title}
            </h1>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 leading-relaxed text-sm">
              <span className="block font-bold text-xs text-slate-600 mb-1">
                توجيهات وتعليمات الأستاذ / الإدارة:
              </span>
              {doc.description}
            </div>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                <User className="w-4 h-4 text-emerald-600" />
                <span>المشرف / الأستاذ</span>
              </div>
              <p className="font-bold text-slate-800 text-sm truncate">{doc.authorName}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>نوع الملف وحجمه</span>
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {doc.fileFormat.toUpperCase()} ({doc.fileSize})
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>تاريخ النشر</span>
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {new Date(doc.uploadDate).toLocaleDateString('ar-DZ')}
              </p>
            </div>
          </div>

          {/* Target Classes */}
          {(() => {
            const targetClasses = Array.isArray(doc.targetClasses) && doc.targetClasses.length > 0 ? doc.targetClasses : ['ALL'];
            return (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  الأقسام والفصول المعنية بالوثيقة:
                </label>
                <div className="flex flex-wrap gap-2">
                  {targetClasses.includes('ALL') ? (
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1 rounded-xl text-xs">
                      جميع أقسام وأطوار متوسطة الشهيد بن نعمة
                    </span>
                  ) : (
                    targetClasses.map(cls => (
                      <span
                        key={cls}
                        className="bg-sky-100 text-sky-900 border border-sky-300 font-bold px-3 py-1 rounded-xl text-xs"
                      >
                        {cls}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* Institutional note */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <GraduationCap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">{SCHOOL_NAME} - الأرضية الرقمية</p>
              <p className="text-amber-800">
                هذه الوثيقة مخصصة للاستخدام البيداغوجي والتعليمي الداخلي لتلاميذ وأساتذة المؤسسة. يمكنك تحميلها بصيغة {doc.fileFormat.toUpperCase()} وقراءتها على الهاتف أو الحاسوب دون الحاجة للاتصال الدائم.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
            >
              إغلاق
            </button>

            <button
              onClick={() => {
                downloadFile(doc);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الوثيقة الآن</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
