import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  FileText,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { AppNotification, UserProfile } from '../../types';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/storageService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUser: UserProfile | null;
  onSelectNotification?: (notification: AppNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUser,
  onSelectNotification,
}) => {
  const [filter, setFilter] = useState<'all' | 'document' | 'announcement' | 'peer'>('all');

  if (!isOpen) return null;

  const userId = currentUser?.identifier || 'guest';

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'document') return n.type === 'document';
    if (filter === 'announcement') return n.type === 'announcement' || n.type === 'summon';
    if (filter === 'peer') return n.type === 'peer_post' || n.type === 'peer_reply';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.readBy || !n.readBy.includes(userId)).length;

  const handleMarkAllRead = () => {
    if (userId) {
      markAllNotificationsAsRead(userId);
    }
  };

  const handleItemClick = (notif: AppNotification) => {
    if (userId) {
      markNotificationAsRead(notif.id, userId);
    }
    if (onSelectNotification) {
      onSelectNotification(notif);
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'document':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'announcement':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
      case 'summon':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case 'peer_post':
      case 'peer_reply':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      return `منذ ${diffDays} يوم`;
    } catch {
      return 'مؤخراً';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bell className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">مركز التنبيهات المدرسية</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-xs">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200">
                إشعارات فورية بالوثائق الجديدة، الإعلانات، ومشاركات الأقسام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('document')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'document'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              الوثائق والفروض
            </button>
            <button
              onClick={() => setFilter('announcement')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'announcement'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              الإعلانات
            </button>
            <button
              onClick={() => setFilter('peer')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'peer'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              دروس القسم
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold hover:underline shrink-0 flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تعليم الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="font-bold text-slate-700 text-sm">لا توجد تنبيهات في هذا القسم</p>
              <p className="text-xs text-slate-400">
                سيظهر هنا أي إشعار فور رفع الأستاذ لوثيقة جديدة أو نشر إعلان مهم.
              </p>
            </div>
          ) : (
            filteredNotifications.map(notif => {
              const isUnread = !notif.readBy || !notif.readBy.includes(userId);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    isUnread
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs hover:bg-emerald-50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs sm:text-sm truncate ${
                          isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium font-mono">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span className="font-bold text-emerald-800">
                        {notif.sourceAuthorName}
                      </span>
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>جديد</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>المزامنة المركزية تعمل مباشرة عبر كافة الأجهزة</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
