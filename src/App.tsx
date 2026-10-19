/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Download,
  FileCheck,
  FileText,
  GraduationCap,
  LogIn,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Navbar } from './components/Navbar';
import { DocumentCard } from './components/common/DocumentCard';
import { DocumentPreviewModal } from './components/common/DocumentPreviewModal';
import { NotificationToast } from './components/common/NotificationToast';
import { NotificationsModal } from './components/common/NotificationsModal';
import { PwaInstallModal } from './components/common/PwaInstallModal';
import { BursarView } from './components/bursar/BursarView';
import { CensorView } from './components/censor/CensorView';
import { DirectorView } from './components/director/DirectorView';
import { StudentView } from './components/student/StudentView';
import { TeacherView } from './components/teacher/TeacherView';
import { MOCK_USERS, SCHOOL_FULL_HEADER, SCHOOL_NAME } from './data/mockData';
import {
  getAnnouncements,
  getCurrentUser,
  getDocuments,
  getNotifications,
  getSummons,
  getUnreadNotificationsCount,
  initStorage,
  setCurrentUser,
  syncWithServer,
} from './services/storageService';
import {
  AppNotification,
  ParentSummon,
  SchoolAnnouncement,
  SchoolDocument,
  UserProfile,
} from './types';

export default function App() {
  const [currentUser, setUser] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [summons, setSummons] = useState<ParentSummon[]>([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Notifications & Document Preview State
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getNotifications());
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);

  const refreshAllData = () => {
    setUser(getCurrentUser());
    setDocuments(getDocuments());
    setAnnouncements(getAnnouncements());
    setSummons(getSummons());
    const notifs = getNotifications();
    setNotifications(notifs);
    setUnreadNotifsCount(getUnreadNotificationsCount(getCurrentUser()?.identifier));
  };

  useEffect(() => {
    initStorage();
    refreshAllData();

    const handleAuthChange = () => {
      const u = getCurrentUser();
      setUser(u);
      setUnreadNotifsCount(getUnreadNotificationsCount(u?.identifier));
    };
    const handleDocsChange = () => setDocuments(getDocuments());
    const handleAnnsChange = () => setAnnouncements(getAnnouncements());
    const handleSummonsChange = () => setSummons(getSummons());
    const handleNotifsChange = () => {
      const notifs = getNotifications();
      setNotifications(notifs);
      setUnreadNotifsCount(getUnreadNotificationsCount(getCurrentUser()?.identifier));
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('documents-change', handleDocsChange);
    window.addEventListener('announcements-change', handleAnnsChange);
    window.addEventListener('summons-change', handleSummonsChange);
    window.addEventListener('notifications-change', handleNotifsChange);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('documents-change', handleDocsChange);
      window.removeEventListener('announcements-change', handleAnnsChange);
      window.removeEventListener('summons-change', handleSummonsChange);
      window.removeEventListener('notifications-change', handleNotifsChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleCopyCleanLink = () => {
    const cleanUrl = window.location.origin;
    navigator.clipboard.writeText(cleanUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    setUser(user);
    refreshAllData();
    syncWithServer().then(() => refreshAllData()).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Cairo',sans-serif] pb-14 sm:pb-0">
      {/* Top Institutional Header */}
      <Navbar
        currentUser={currentUser}
        onOpenLogin={() => setLoginModalOpen(true)}
        onSelectUser={handleSelectUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentUser ? (
          <>
            {currentUser.role === 'student' && (
              <StudentView
                currentUser={currentUser}
                documents={documents}
                announcements={announcements}
                summons={summons}
                onRefreshData={refreshAllData}
              />
            )}

            {currentUser.role === 'teacher' && (
              <TeacherView
                currentUser={currentUser}
                documents={documents}
                announcements={announcements}
                onRefreshData={refreshAllData}
              />
            )}

            {/* Bursar Space (المصالح الاقتصادية والمقتصدة - إدارة واستدعاء العمال المهنيين) */}
            {currentUser.role === 'staff' &&
              (currentUser.title?.includes('مقتصد') ||
                currentUser.rank?.includes('مقتصد') ||
                currentUser.identifier === '1197748280037000') && (
                <BursarView
                  currentUser={currentUser}
                  onRefreshData={refreshAllData}
                />
              )}

            {/* Censor Space (الناظرة - مسؤولة عن مشرفي التربية والتلاميذ) */}
            {(currentUser.role === 'censor' ||
              (currentUser.role === 'staff' &&
                !currentUser.title?.includes('مقتصد') &&
                !currentUser.rank?.includes('مقتصد') &&
                currentUser.identifier !== '1197748280037000')) && (
              <CensorView
                currentUser={currentUser}
                announcements={announcements}
                summons={summons}
                onRefreshData={refreshAllData}
              />
            )}

            {currentUser.role === 'director' && (
              <DirectorView
                currentUser={currentUser}
                documents={documents}
                announcements={announcements}
                summons={summons}
                onRefreshData={refreshAllData}
              />
            )}
          </>
        ) : (
          /* Public Landing State when not logged in */
          <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-10">
            {/* Welcome Institutional Hero */}
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-1">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-xl border-2 border-emerald-500/40 bg-emerald-950 p-1 group hover:scale-105 transition-transform duration-300">
                  <img
                    src="/pwa-192x192.png"
                    alt={SCHOOL_NAME}
                    className="w-full h-full object-cover rounded-2xl shadow-inner"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>المنصة الرقمية الرسمية لمؤسسة التربية والتعليم</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                {SCHOOL_NAME}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                فضاء رقمي متكامل لتبادل الوثائق التعليمية والفروض والدروس (Word و PDF) بين الأساتذة والتلاميذ، وإدارة الإعلانات واستدعاءات الأولياء عبر واتساب.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setLoginModalOpen(true)}
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#fef08a',
                    borderColor: '#10b981',
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-900 hover:bg-emerald-950 text-yellow-300 font-extrabold text-sm sm:text-base shadow-lg transition-transform active:scale-95 flex items-center gap-2.5 border-2 border-emerald-500 cursor-pointer"
                >
                  <LogIn className="w-5 h-5 text-yellow-300" />
                  <span style={{ color: '#fef08a', fontWeight: 900 }}>تسجيل الدخول إلى المنصة</span>
                </button>

                <button
                  onClick={() => setPwaModalOpen(true)}
                  className="px-5 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-sm sm:text-base border border-emerald-300 shadow-sm transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                  <span>تثبيت التطبيق على الهاتف</span>
                </button>

                <button
                  onClick={handleCopyCleanLink}
                  className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm sm:text-base border border-slate-300 shadow-sm transition-transform active:scale-95 flex items-center gap-2"
                  title="نسخ ومشاركة رابط المنصة بدون فتح حسابك"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="text-emerald-700">تم نسخ الرابط العام!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5 text-slate-600" />
                      <span>مشاركة الرابط العام</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Role Gateways Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Director Card */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className="bg-white rounded-3xl border-2 border-purple-400 p-5 shadow-xs hover:shadow-md hover:border-purple-600 cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">فضاء السيد المدير</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  الإشراف العام على المؤسسة، تفعيل حسابات الأساتذة، ومصادقة استعادة كلمات السر.
                </p>
                <div className="text-xs font-bold text-purple-700 flex items-center gap-1">
                  <span>دخول المدير</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Censor Card */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-teal-500 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">مكتب السيدة الناظرة</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  مسؤولة عن <strong>مشرفي التربية (3 مشرفين)</strong> واستدعائهم، وتنظيم شؤون واستدعاءات أولياء التلاميذ.
                </p>
                <div className="text-xs font-bold text-teal-700 flex items-center gap-1">
                  <span>دخول الناظرة</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bursar Card */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-600 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">المصالح الاقتصادية</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  مسؤولة عن <strong>العمال المهنيين (10 عمال)</strong>، استدعاؤهم وتكليفهم بمهام الصيانة والنظافة.
                </p>
                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <span>دخول المقتصدة</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Teacher Card */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-500 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">فضاء الأساتذة</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  إسناد حصري للأقسام الرسمية ونشر الدروس والفروض الموجهة لتلاميذ أقسام الأستاذ فقط.
                </p>
                <div className="text-xs font-bold text-blue-700 flex items-center gap-1">
                  <span>دخول الأستاذ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Student Card */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-500 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">فضاء التلاميذ</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  تلقي الدروس والفروض حصرياً من أساتذة القسم المعتمدين والمحادثة الآمنة مع الزملاء.
                </p>
                <div
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#fef08a',
                    borderColor: '#10b981',
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900 text-yellow-300 text-[11px] font-black shadow-xs border border-emerald-500 group-hover:bg-emerald-950 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>دخول التلميذ</span>
                  <ArrowRight className="w-3 h-3 text-yellow-300 rtl:rotate-180" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-right">
            <p className="font-bold text-slate-800 text-sm">{SCHOOL_NAME}</p>
            <p className="text-slate-500 mt-0.5">
              الجمهورية الجزائرية الديمقراطية الشعبية - وزارة التربية الوطنية
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-emerald-700">منصة تعمل على الهاتف والويب</span>
            <span>•</span>
            <span>تبادل الوثائق الرقمية</span>
            <span>•</span>
            <span>خدمة استدعاءات واتساب</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentUser={currentUser}
        onOpenSwitch={() => setLoginModalOpen(true)}
        onOpenPwaInstall={() => setPwaModalOpen(true)}
        onOpenNotifications={() => setNotificationsModalOpen(true)}
        unreadNotificationsCount={unreadNotifsCount}
      />

      {/* Real-time Notification Alert Toast (Audio Chime + Popup Banner) */}
      <NotificationToast
        onOpenDocument={doc => setPreviewDoc(doc)}
        onOpenAllNotifications={() => setNotificationsModalOpen(true)}
      />

      {/* Direct Document Preview Modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Notifications Center Modal */}
      <NotificationsModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        notifications={notifications}
        currentUser={currentUser}
        onSelectNotification={notif => {
          if (notif.type === 'document' && notif.sourceId) {
            const d = documents.find(doc => doc.id === notif.sourceId);
            if (d) setPreviewDoc(d);
          }
        }}
      />

      {/* Login / Switch Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleSelectUser}
      />

      {/* PWA Mobile Installation Modal */}
      <PwaInstallModal
        isOpen={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
        installPromptEvent={deferredPrompt}
      />
    </div>
  );
}
