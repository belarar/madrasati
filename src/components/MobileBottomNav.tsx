import React from 'react';
import {
  ArrowRightLeft,
  Bell,
  BookOpen,
  Building,
  FileUp,
  GraduationCap,
  MessageCircle,
  Plus,
  Shield,
  Smartphone,
  Users,
} from 'lucide-react';
import { UserProfile } from '../types';

interface MobileBottomNavProps {
  currentUser: UserProfile | null;
  onOpenSwitch: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenPwaInstall?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  onOpenSwitch,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenPwaInstall,
}) => {
  if (!currentUser) return null;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-between shadow-lg">
      {/* Current role quick info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-800 truncate max-w-[140px]">
        <span className="font-bold text-emerald-800 truncate">{currentUser.name}</span>
        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
          {currentUser.role === 'student'
            ? 'تلميذ'
            : currentUser.role === 'teacher'
            ? 'أستاذ'
            : currentUser.role === 'censor'
            ? 'ناظر'
            : 'مدير'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-100 text-slate-700 active:scale-95 transition-transform"
            title="التنبيهات"
          >
            <Bell className="w-4 h-4 text-emerald-800" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationsCount > 9 ? '+9' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {onOpenPwaInstall && (
          <button
            onClick={onOpenPwaInstall}
            className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 active:scale-95 transition-transform"
            title="تثبيت التطبيق"
          >
            <Smartphone className="w-4 h-4 text-emerald-700" />
          </button>
        )}

        <button
          onClick={onOpenSwitch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold active:scale-95 transition-transform shadow-xs"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>تبديل</span>
        </button>
      </div>
    </nav>
  );
};
