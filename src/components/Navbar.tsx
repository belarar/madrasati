import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Building,
  Check,
  CheckCircle2,
  Copy,
  Download,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { MOCK_USERS, SCHOOL_NAME } from '../data/mockData';
import {
  getNotifications,
  getUnreadNotificationsCount,
  registerNewUser,
  setCurrentUser,
  updateCurrentUserPassword,
} from '../services/storageService';
import { AppNotification, UserProfile, UserRole } from '../types';
import { NotificationsModal } from './common/NotificationsModal';
import { PwaInstallModal } from './common/PwaInstallModal';

// Predefined demo profiles for instant 1-click role testing
export const TEST_DIRECTOR: UserProfile = {
  id: 'staff-1097448010036800',
  identifier: '1097448010036800',
  name: 'عدة عمار عبد القادر',
  role: 'director',
  title: 'مدير متوسطة الشهيد بن نعمة مصطفى',
  phone: '0550000001',
};

export const TEST_TEACHER: UserProfile = {
  id: 'staff-1197348010089800',
  identifier: '1197348010089800',
  name: 'حمزة نفيسة',
  role: 'teacher',
  subjects: ['english'],
  title: 'أستاذة التعليم المتوسط - اللغة الإنجليزية',
  phone: '0550000002',
  assignedClasses: ['4AM-1', '4AM-2', '3AM-1', '3AM-2', '2AM-1', '1AM-1'],
};

interface NavbarProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onSelectUser: (user: UserProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onOpenLogin, onSelectUser }) => {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notifications Modal State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getNotifications());
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // PWA Install State
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Share Toast State
  const [copiedShare, setCopiedShare] = useState(false);

  // Staff password update modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync notifications on mount & event
  useEffect(() => {
    const updateNotifs = () => {
      const list = getNotifications();
      setNotifications(list);
      setUnreadCount(getUnreadNotificationsCount(currentUser?.identifier));
    };

    updateNotifs();
    window.addEventListener('notifications-change', updateNotifs);

    // Capture PWA install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('notifications-change', updateNotifs);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [currentUser]);

  const handleCopyCleanLink = () => {
    const cleanUrl = window.location.origin;
    navigator.clipboard.writeText(cleanUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPasswordInput.trim().length < 4) {
      setPwdMsg({ type: 'error', text: 'كلمة السر يجب أن تتكون من 4 خانات على الأقل.' });
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setPwdMsg({ type: 'error', text: 'كلمتا السر غير متطابقتين.' });
      return;
    }

    const res = updateCurrentUserPassword(newPasswordInput.trim());
    if (res.success) {
      setPwdMsg({ type: 'success', text: 'تم تحديث كلمة السر بنجاح (4 خانات فما فوق)!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setPwdMsg(null);
      }, 1000);
    } else {
      setPwdMsg({ type: 'error', text: res.message });
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'student':
        return {
          label: 'تلميذ',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <GraduationCap className="w-3.5 h-3.5" />,
        };
      case 'teacher':
        return {
          label: 'أستاذ',
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <User className="w-3.5 h-3.5" />,
        };
      case 'censor':
        return {
          label: 'ناظر المؤسسة',
          bg: 'bg-teal-100 text-teal-800 border-teal-300',
          icon: <Shield className="w-3.5 h-3.5" />,
        };
      case 'director':
        return {
          label: 'مدير المؤسسة',
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: <Building className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: 'زائر',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <User className="w-3.5 h-3.5" />,
        };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  const handleLogout = () => {
    setCurrentUser(null);
    onOpenLogin();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Algerian Institutional Top Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-700 via-white to-red-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl overflow-hidden shadow-xs border border-emerald-800/30 shrink-0 bg-emerald-900 flex items-center justify-center">
              <img
                src="/pwa-192x192.png"
                alt={SCHOOL_NAME}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-700">
                  وزارة التربية الوطنية
                </span>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[10px] sm:text-xs text-slate-500">الأرضية الرقمية</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                {SCHOOL_NAME}
              </h1>
            </div>
          </div>

          {/* Center/Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Notifications Bell Button */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 transition-all shadow-2xs active:scale-95"
              title="الإشعارات والتنبيهات المدرسية"
            >
              <Bell className="w-4 h-4 text-emerald-800" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
            </button>

            {/* 2. PWA Install App Button */}
            <button
              onClick={() => setPwaModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all shadow-2xs active:scale-95"
              title="تثبيت المنصة كتطبيق على الهاتف"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>تثبيت التطبيق</span>
            </button>

            {/* 3. Share Clean Public Link Button */}
            <button
              onClick={handleCopyCleanLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all shadow-2xs active:scale-95"
              title="نسخ ومشاركة رابط المنصة النظيف دون فتح حسابك للآخرين"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden md:inline">مشاركة الرابط</span>
                </>
              )}
            </button>

            {/* Role Switcher / Login Action */}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all shadow-2xs"
              title="دخول تلميذ جديد أو موظف"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
              <span>{currentUser ? 'تبديل الحساب' : 'تسجيل الدخول'}</span>
            </button>

            {/* Current User Badge */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-left text-xs bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-bold text-slate-900">{currentUser.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.bg}`}
                    >
                      {roleInfo.icon}
                      <span>{roleInfo.label}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 text-right font-mono" dir="ltr">
                    {currentUser.identifier}
                  </span>
                </div>

                {currentUser.role !== 'student' && (
                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setPwdMsg(null);
                      setNewPasswordInput('');
                      setConfirmPasswordInput('');
                    }}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="تحديث كلمة السر الشخصية"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="hidden md:inline">تحديث كلمة السر</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fast Role Switcher Strip for Instant Testing */}
      <div className="bg-slate-100/90 border-t border-slate-200/90 px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">تبديل فوري لتجريب المنصة والمزامنة:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              registerNewUser(TEST_DIRECTOR);
              setCurrentUser(TEST_DIRECTOR);
              onSelectUser(TEST_DIRECTOR);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs active:scale-95 ${
              currentUser?.role === 'director'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white hover:bg-purple-50 text-purple-900 border border-purple-200'
            }`}
            title="تجريب فوري كمدير المؤسسة"
          >
            <Building className="w-3 h-3 text-purple-400" />
            <span>👔 المدير (السيد عدة عمار)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              registerNewUser(TEST_TEACHER);
              setCurrentUser(TEST_TEACHER);
              onSelectUser(TEST_TEACHER);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs active:scale-95 ${
              currentUser?.role === 'teacher'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white hover:bg-blue-50 text-blue-900 border border-blue-200'
            }`}
            title="تجريب فوري كأستاذة"
          >
            <User className="w-3 h-3 text-blue-400" />
            <span>👨‍🏫 أستاذة (حمزة نفيسة - إنجليزية)</span>
          </button>
        </div>
      </div>

      {/* Password Update Modal for Logged-In Staff */}
      {showPasswordModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 px-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base">تحديث كلمة السر الشخصية</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-5 sm:p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700">
                الموظف(ة): <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.title})
                <br />
                رقم التعريف المهني: <span className="font-mono text-emerald-800 font-bold">{currentUser.identifier}</span>
              </div>

              {pwdMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    pwdMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {pwdMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span className="font-bold">{pwdMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة السر الجديدة (4 خانات فما فوق): <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="كلمة السر الجديدة"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة السر الجديدة: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="أعد كتابة كلمة السر"
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm outline-none font-mono"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>حفظ وتحديث كلمة السر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        currentUser={currentUser}
      />

      {/* PWA Mobile Installation Modal */}
      <PwaInstallModal
        isOpen={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
        installPromptEvent={deferredPrompt}
      />
    </header>
  );
};
