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
  Users,
} from 'lucide-react';
import { UserProfile } from '../types';

interface MobileBottomNavProps {
  currentUser: UserProfile | null;
  onOpenSwitch: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  onOpenSwitch,
}) => {
  if (!currentUser) return null;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
      {/* Current role quick info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-800">
        <span className="font-bold text-emerald-800">{currentUser.name}</span>
        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
          {currentUser.role === 'student'
            ? 'تلميذ'
            : currentUser.role === 'teacher'
            ? 'أستاذ'
            : currentUser.role === 'censor'
            ? 'ناظر'
            : 'مدير'}
        </span>
      </div>

      <button
        onClick={onOpenSwitch}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 active:scale-95 transition-transform"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        <span>تبديل الحساب</span>
      </button>
    </nav>
  );
};
