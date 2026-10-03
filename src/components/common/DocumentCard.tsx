import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Presentation,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { SUBJECTS } from '../../data/mockData';
import { downloadFile } from '../../services/storageService';
import { SchoolDocument, UserProfile } from '../../types';

interface DocumentCardProps {
  doc: SchoolDocument;
  currentUser: UserProfile | null;
  onPreview: (doc: SchoolDocument) => void;
  onDelete?: (docId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  currentUser,
  onPreview,
  onDelete,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const subjectInfo = SUBJECTS.find(s => s.id === doc.subject);

  const getFormatBadge = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: <FileText className="w-5 h-5 text-red-600" />,
          label: 'PDF',
        };
      case 'docx':
      case 'doc':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <FileCheck className="w-5 h-5 text-blue-600" />,
          label: 'Word',
        };
      case 'xlsx':
      case 'xls':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
          label: 'Excel',
        };
      case 'pptx':
      case 'ppt':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Presentation className="w-5 h-5 text-amber-600" />,
          label: 'PowerPoint',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: <FileText className="w-5 h-5 text-slate-600" />,
          label: format.toUpperCase(),
        };
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'bem_prep':
        return { label: 'تحضير شهادة BEM', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'summary':
        return { label: 'ملخص شامل', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'homework':
        return { label: 'واجب منزلي', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'test':
        return { label: 'فرض محروس', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'exercise':
        return { label: 'سلسلة تمارين', color: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'circular':
        return { label: 'منشور وزاري/إداري', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      default:
        return { label: 'درس ومطبوعة', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const formatMeta = getFormatBadge(doc.fileFormat);
  const typeMeta = getDocTypeBadge(doc.docType);

  const canDelete =
    currentUser &&
    (currentUser.role === 'director' ||
      (currentUser.role === 'teacher' && currentUser.id === doc.authorId));

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      downloadFile(doc);
      setDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }, 300);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group relative overflow-hidden">
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${subjectInfo?.color || 'from-emerald-500 to-teal-600'}`} />

      <div>
        {/* Header Tags: Format, Doc Type, Subject */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pt-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${formatMeta.bg}`}
            >
              {formatMeta.icon}
              <span>{formatMeta.label}</span>
            </span>

            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeMeta.color}`}
            >
              {typeMeta.label}
            </span>
          </div>

          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {subjectInfo?.name || 'عام'}
          </span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onPreview(doc)}
          className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 cursor-pointer transition-colors line-clamp-2 mb-2 leading-snug"
        >
          {doc.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {doc.description}
        </p>

        {/* Target Audience / Classes Pills */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 ml-1">الجمهور المستهدف:</span>
          {doc.targetAudience === 'specific_student' ? (
            <span className="text-xs bg-purple-50 text-purple-900 font-bold px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
              <span>👤 خاص بالتلميذ:</span>
              <span className="text-purple-700">{doc.targetStudentName || doc.targetStudentId}</span>
            </span>
          ) : doc.targetAudience === 'teachers' ? (
            <span className="text-xs bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-200">
              👨‍🏫 السادة الأساتذة
            </span>
          ) : doc.targetAudience === 'staff' ? (
            <span className="text-xs bg-teal-50 text-teal-900 font-bold px-2 py-0.5 rounded-md border border-teal-200">
              👥 موظفو الإدارة والتربية
            </span>
          ) : doc.targetAudience === 'specific_class' ? (
            <span className="text-xs bg-sky-50 text-sky-900 font-bold px-2 py-0.5 rounded-md border border-sky-200">
              🏫 قسم: {doc.targetClasses.join('، ')}
            </span>
          ) : doc.targetClasses.includes('ALL') || doc.targetAudience === 'all_students' ? (
            <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
              🌐 جميع تلاميذ المؤسسة
            </span>
          ) : (
            doc.targetClasses.map(cls => (
              <span
                key={cls}
                className="text-xs bg-sky-50 text-sky-800 font-semibold px-2 py-0.5 rounded-md border border-sky-200"
              >
                {cls}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-100 mt-2 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-slate-700">{doc.authorName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(doc.uploadDate).toLocaleDateString('ar-DZ')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.98]'
            }`}
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تم التحميل</span>
              </>
            ) : downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جارٍ التحميل...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل ({doc.fileSize})</span>
              </>
            )}
          </button>

          <button
            onClick={() => onPreview(doc)}
            title="معاينة التفاصيل"
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(doc.id)}
              title="حذف الوثيقة"
              className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
