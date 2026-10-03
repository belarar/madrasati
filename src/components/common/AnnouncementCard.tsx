import React from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  Flame,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { AnnouncementPriority, AnnouncementTarget, SchoolAnnouncement, UserProfile } from '../../types';

interface AnnouncementCardProps {
  announcement: SchoolAnnouncement;
  currentUser: UserProfile | null;
  onDelete?: (id: string) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  currentUser,
  onDelete,
}) => {
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
    currentUser && (currentUser.role === 'director' || currentUser.role === 'censor');

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
