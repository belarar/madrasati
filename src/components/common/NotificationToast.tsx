import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  FileText,
  AlertCircle,
  MessageCircle,
  X,
  ExternalLink,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { AppNotification, SchoolDocument, SchoolAnnouncement } from '../../types';
import { getDocuments, getAnnouncements } from '../../services/storageService';
import {
  isNotificationSupported,
  requestNotificationPermission,
  playNotificationChime,
} from '../../services/notificationService';

interface NotificationToastProps {
  onOpenDocument?: (doc: SchoolDocument) => void;
  onOpenAnnouncement?: (ann: SchoolAnnouncement) => void;
  onOpenAllNotifications?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  onOpenDocument,
  onOpenAnnouncement,
  onOpenAllNotifications,
}) => {
  const [currentNotif, setCurrentNotif] = useState<AppNotification | null>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Check if permission prompt can be offered
    if (isNotificationSupported() && Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('notif_perm_dismissed');
      if (!dismissed) {
        setShowPermissionBanner(true);
      }
    }

    const handleNewNotif = (e: any) => {
      const notif: AppNotification = e.detail;
      if (!notif) return;

      setCurrentNotif(notif);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Auto close after 8.5 seconds
      timerRef.current = setTimeout(() => {
        setCurrentNotif(null);
      }, 8500);
    };

    window.addEventListener('notification-received', handleNewNotif);

    return () => {
      window.removeEventListener('notification-received', handleNewNotif);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleEnableBrowserNotifications = async () => {
    const res = await requestNotificationPermission();
    setShowPermissionBanner(false);
    sessionStorage.setItem('notif_perm_dismissed', '1');
    if (res === 'granted') {
      playNotificationChime();
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    sessionStorage.setItem('notif_perm_dismissed', '1');
  };

  const handleActionClick = () => {
    if (!currentNotif) return;

    if (currentNotif.type === 'document' && currentNotif.sourceId) {
      const allDocs = getDocuments();
      const targetDoc = allDocs.find(d => d.id === currentNotif.sourceId);
      if (targetDoc && onOpenDocument) {
        onOpenDocument(targetDoc);
        setCurrentNotif(null);
        return;
      }
    }

    if (currentNotif.type === 'announcement' && currentNotif.sourceId) {
      const allAnns = getAnnouncements();
      const targetAnn = allAnns.find(a => a.id === currentNotif.sourceId);
      if (targetAnn && onOpenAnnouncement) {
        onOpenAnnouncement(targetAnn);
        setCurrentNotif(null);
        return;
      }
    }

    if (onOpenAllNotifications) {
      onOpenAllNotifications();
    }
    setCurrentNotif(null);
  };

  return (
    <>
      {/* 1. Browser Notification Permission Prompt (Gentle Non-intrusive Banner) */}
      {showPermissionBanner && (
        <div className="fixed top-18 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-emerald-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center shrink-0 text-emerald-200">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">تفعيل التنبيهات المباشرة</h4>
              <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                هل ترغب في تلقي إشعار فوري بصوت مميز فور نشر وثيقة أو إعلان جديد؟
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleEnableBrowserNotifications}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  تفعيل الآن
                </button>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-800/60 text-emerald-200 hover:text-white font-medium text-xs hover:bg-emerald-800 transition-all cursor-pointer"
                >
                  لاحقاً
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/50"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Real-time Incoming Notification Toast */}
      {currentNotif && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-20 sm:top-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 bg-slate-900/95 backdrop-blur-lg text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Type Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  currentNotif.type === 'document'
                    ? 'bg-blue-600 text-white'
                    : currentNotif.type === 'announcement'
                    ? 'bg-amber-600 text-white'
                    : currentNotif.type === 'summon'
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {currentNotif.type === 'document' ? (
                  <FileText className="w-5 h-5" />
                ) : currentNotif.type === 'announcement' ? (
                  <Bell className="w-5 h-5" />
                ) : currentNotif.type === 'summon' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      currentNotif.type === 'document'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : currentNotif.type === 'announcement'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {currentNotif.type === 'document'
                      ? 'وثيقة جديدة'
                      : currentNotif.type === 'announcement'
                      ? 'إعلان رسمي'
                      : 'تنبيه مدرسي'}
                  </span>
                  <span className="text-[11px] text-slate-400">الآن</span>
                </div>

                <h3 className="text-sm font-bold text-white mt-1 truncate">
                  {currentNotif.title}
                </h3>

                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                  {currentNotif.message}
                </p>

                {currentNotif.sourceAuthorName && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    بواسطة: <span className="text-slate-200 font-medium">{currentNotif.sourceAuthorName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCurrentNotif(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleActionClick}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {currentNotif.type === 'document'
                  ? 'معاينة الوثيقة فوراً'
                  : currentNotif.type === 'announcement'
                  ? 'قراءة الإعلان كاملاً'
                  : 'عرض التفاصيل'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => playNotificationChime()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
              title="إعادة نغمة التنبيه"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress bar countdown */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-2xl overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[shrink_8.5s_linear_forwards]" />
          </div>
        </div>
      )}
    </>
  );
};
