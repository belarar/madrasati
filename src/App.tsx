/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building,
  CheckCircle2,
  FileCheck,
  FileText,
  GraduationCap,
  LogIn,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Navbar } from './components/Navbar';
import { CensorView } from './components/censor/CensorView';
import { DirectorView } from './components/director/DirectorView';
import { StudentView } from './components/student/StudentView';
import { TeacherView } from './components/teacher/TeacherView';
import { MOCK_USERS, SCHOOL_FULL_HEADER, SCHOOL_NAME } from './data/mockData';
import {
  getAnnouncements,
  getCurrentUser,
  getDocuments,
  getSummons,
  initStorage,
  setCurrentUser,
} from './services/storageService';
import {
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

  const refreshAllData = () => {
    setUser(getCurrentUser());
    setDocuments(getDocuments());
    setAnnouncements(getAnnouncements());
    setSummons(getSummons());
  };

  useEffect(() => {
    initStorage();
    refreshAllData();

    const handleAuthChange = () => setUser(getCurrentUser());
    const handleDocsChange = () => setDocuments(getDocuments());
    const handleAnnsChange = () => setAnnouncements(getAnnouncements());
    const handleSummonsChange = () => setSummons(getSummons());

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('documents-change', handleDocsChange);
    window.addEventListener('announcements-change', handleAnnsChange);
    window.addEventListener('summons-change', handleSummonsChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('documents-change', handleDocsChange);
      window.removeEventListener('announcements-change', handleAnnsChange);
      window.removeEventListener('summons-change', handleSummonsChange);
    };
  }, []);

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    setUser(user);
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

            {(currentUser.role === 'censor' || currentUser.role === 'staff') && (
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
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
                  className="px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md transition-transform active:scale-95 flex items-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>تسجيل الدخول إلى المنصة</span>
                </button>
              </div>
            </div>

            {/* Role Gateways Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Director Card - Official ID 1097448010036800 */}
              <div
                onClick={() => setLoginModalOpen(true)}
                className="bg-white rounded-3xl border-2 border-purple-400 p-5 shadow-xs hover:shadow-md hover:border-purple-600 cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">فضاء السيد المدير</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  الدخول بالرقم المهني (<span className="font-mono font-bold text-purple-900">1097448010036800</span>) وكلمة السر.
                </p>
                <div className="text-xs font-bold text-purple-700 flex items-center gap-1">
                  <span>تسجيل الدخول كمدير</span>
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
                <h3 className="font-bold text-slate-900 text-lg mb-1">فضاء التلاميذ</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  تسجيل الدخول بالرقم المدرسي، اللقب والاسم الحقيقي، والقسم لتحميل الفروض والدروس.
                </p>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <span>دخول التلميذ</span>
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
                <h3 className="font-bold text-slate-900 text-lg mb-1">فضاء الأساتذة</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  الدخول بالرقم المهني والاسم والمادة لإرسال وثائق وفروض Word و PDF للأقسام.
                </p>
                <div className="text-xs font-bold text-blue-700 flex items-center gap-1">
                  <span>دخول الأستاذ</span>
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
                <h3 className="font-bold text-slate-900 text-lg mb-1">مكتب الناظر</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  نشر إعلانات التلاميذ وإرسال استدعاءات الأولياء الرسمية مباشرة عبر تطبيق واتساب.
                </p>
                <div className="text-xs font-bold text-teal-700 flex items-center gap-1">
                  <span>دخول الناظر</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
      />

      {/* Login / Switch Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleSelectUser}
      />
    </div>
  );
}
