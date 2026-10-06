import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Flame,
  Image as ImageIcon,
  Paperclip,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { AnnouncementPriority, AnnouncementTarget, SchoolAnnouncement, UserProfile } from '../../types';
import { downloadAnnouncementAttachment } from '../../services/storageService';

interface AnnouncementCardProps {
  announcement: SchoolAnnouncement;
  currentUser: UserProfile | null;
  onDelete?: (id: string) => void;
  onPreviewAttachment?: (announcement: SchoolAnnouncement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  currentUser,
  onDelete,
  onPreviewAttachment,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadAnnouncementAttachment(announcement);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };
  const getPriorityStyle = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'urgent':
        return {
          border: 'border-red-300 bg-red-50/70',
          badge: 'bg-red-600 text-white',
          label: 'عاجل جداً ومهم',
          icon: <Flame className="w-4 h-4 text-red-500 animate-pulse" />,
        };
      case 'important':
        return {
          border: 'border-amber-300 bg-amber-50/70',
          badge: 'bg-amber-600 text-white',
          label: 'هام',
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
        };
      default:
        return {
          border: 'border-slate-200 bg-white',
          badge: 'bg-emerald-700 text-white',
          label: 'إعلان عام',
          icon: <Bell className="w-4 h-4 text-emerald-600" />,
        };
    }
  };

  const getTargetLabel = (target: AnnouncementTarget) => {
    switch (target) {
      case 'students':
        return 'موجه للتلاميذ';
      case 'teachers':
        return 'موجه للأساتذة';
      case 'staff':
        return 'موجه للموظفين والعمال';
      default:
        return 'موجه للجميع (عام)';
    }
  };

  const style = getPriorityStyle(announcement.priority);
  const canDelete =
    currentUser &&
    (currentUser.role === 'director' ||
      currentUser.role === 'censor' ||
      (currentUser.role === 'teacher' &&
        (announcement.authorRole === 'teacher' || announcement.authorName?.includes(currentUser.name))));

  return (
    <div
      className={`rounded-2xl border ${style.border} p-5 shadow-xs transition-all hover:shadow-md relative overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${style.badge}`}
          >
            {style.icon}
            <span>{style.label}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{getTargetLabel(announcement.target)}</span>
          </span>

          {announcement.badge && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              {announcement.badge}
            </span>
          )}
        </div>

        {canDelete && onDelete && (
          <button
            onClick={() => onDelete(announcement.id)}
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors"
            title="حذف الإعلان"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug">
        {announcement.title}
      </h3>

      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-4">
        {announcement.content}
      </p>

      {/* Attached Document / File */}
      {announcement.fileName && (
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                announcement.fileFormat === 'pdf'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : announcement.fileFormat === 'docx' || announcement.fileFormat === 'doc'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : announcement.fileFormat === 'image'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {announcement.fileFormat === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">مرفق رسمي:</span>
                <span className="text-xs font-bold text-slate-800 truncate block max-w-[240px] sm:max-w-xs">
                  {announcement.fileName}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {announcement.fileSize || 'ملف جاهز للتحميل'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onPreviewAttachment && announcement.fileDataUrl && (
              <button
                type="button"
                onClick={() => onPreviewAttachment(announcement)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                downloaded
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {downloaded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم التحميل</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل المرفق</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200/60">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>المُصدر: {announcement.authorName}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(announcement.createdAt).toLocaleDateString('ar-DZ')}</span>
        </div>
      </div>
    </div>
  );
};
