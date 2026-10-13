import React, { useState, useMemo, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  UserCheck,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Printer,
  Sparkles,
  CheckCircle2,
  X,
  BookOpen,
  Building,
  Clock,
  ShieldAlert,
  Trash2,
  CheckCheck,
  Ban,
} from 'lucide-react';
import {
  getOfficialStaffAccountList,
  setStaffMemberPassword,
  StaffAccountItem,
  PasswordResetRequest,
  getPasswordResetRequests,
  fetchPasswordResetRequestsFromServer,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  deletePasswordResetRequest,
} from '../../services/storageService';
import { SCHOOL_NAME } from '../../data/mockData';

export const StaffAccountsManager: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffAccountItem[]>(() => getOfficialStaffAccountList());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teachers' | 'admin' | 'supervisors' | 'workers'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'pending'>('all');

  // Password Reset Requests State
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>(() => getPasswordResetRequests());
  const [activeRequestsTab, setActiveRequestsTab] = useState<'pending' | 'history'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [visibleReqPasswords, setVisibleReqPasswords] = useState<Record<string, boolean>>({});
  
  // Visibility toggles for passwords: identifier -> boolean
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  // Copy status feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  // Edit / Set Password Modal State
  const [selectedStaff, setSelectedStaff] = useState<StaffAccountItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showModalPass, setShowModalPass] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshList = () => {
    setStaffList(getOfficialStaffAccountList());
    setResetRequests(getPasswordResetRequests());
    fetchPasswordResetRequestsFromServer().then(data => {
      if (data) setResetRequests(data);
    });
  };

  useEffect(() => {
    fetchPasswordResetRequestsFromServer().then(data => {
      if (data) setResetRequests(data);
    });

    const handleReqUpdate = () => {
      setResetRequests(getPasswordResetRequests());
      setStaffList(getOfficialStaffAccountList());
    };

    window.addEventListener('password-requests-updated', handleReqUpdate);
    return () => window.removeEventListener('password-requests-updated', handleReqUpdate);
  }, []);

  const handleApproveRequest = async (reqId: string) => {
    setActionLoadingId(reqId);
    setRequestFeedback(null);
    const res = await approvePasswordResetRequest(reqId);
    setActionLoadingId(null);
    if (res.success) {
      setRequestFeedback({ type: 'success', message: res.message });
      setStaffList(getOfficialStaffAccountList());
      setResetRequests(getPasswordResetRequests());
    } else {
      setRequestFeedback({ type: 'error', message: res.message });
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    setActionLoadingId(reqId);
    setRequestFeedback(null);
    const res = await rejectPasswordResetRequest(reqId);
    setActionLoadingId(null);
    if (res.success) {
      setRequestFeedback({ type: 'success', message: res.message });
      setResetRequests(getPasswordResetRequests());
    } else {
      setRequestFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDeleteRequest = async (reqId: string) => {
    const res = await deletePasswordResetRequest(reqId);
    if (res.success) {
      setResetRequests(getPasswordResetRequests());
    }
  };

  const toggleReqPassVisibility = (reqId: string) => {
    setVisibleReqPasswords(prev => ({
      ...prev,
      [reqId]: !prev[reqId],
    }));
  };

  const pendingRequests = useMemo(() => {
    return resetRequests.filter(r => r.status === 'pending');
  }, [resetRequests]);

  const historyRequests = useMemo(() => {
    return resetRequests.filter(r => r.status !== 'pending');
  }, [resetRequests]);

  const togglePasswordVisibility = (identifier: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [identifier]: !prev[identifier],
    }));
  };

  const handleCopyText = (text: string, type: 'id' | 'pass' | 'card', staffId: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(staffId);
      setTimeout(() => setCopiedId(null), 2000);
    } else if (type === 'pass') {
      setCopiedPass(staffId);
      setTimeout(() => setCopiedPass(null), 2000);
    } else {
      setCopiedCard(staffId);
      setTimeout(() => setCopiedCard(null), 2000);
    }
  };

  const handleCopyFullCredentialsCard = (staff: StaffAccountItem) => {
    const passDisplay = staff.pin || 'لم يتم تعيينها بعد (يختارها عند أول تسجيل دخول)';
    const cardText = `🏛️ متوسطة الشهيد بن نعمة مصطفى\nبطاقة الدخول الرسمية للمنصة الرقمية:\n━━━━━━━━━━━━━━━━━━━━\n👤 الأستاذ/الموظف: ${staff.fullName}\n💼 الرتبة: ${staff.rank} ${staff.subjectName ? `(${staff.subjectName})` : ''}\n🔢 الرقم المهني (16 رقماً): ${staff.identifier}\n🔑 كلمة السر الشخصية: ${passDisplay}\n━━━━━━━━━━━━━━━━━━━━\n🔗 رابط المنصة: ${window.location.origin}`;
    handleCopyText(cardText, 'card', staff.identifier);
  };

  const openResetModal = (staff: StaffAccountItem) => {
    setSelectedStaff(staff);
    setNewPasswordInput(staff.pin || '');
    setModalFeedback(null);
    setShowModalPass(false);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setModalFeedback({
        type: 'error',
        message: 'كلمة السر يجب أن تتكون من 4 خانات على الأقل.',
      });
      return;
    }

    setIsSubmitting(true);
    const result = setStaffMemberPassword(selectedStaff.identifier, newPasswordInput.trim());

    if (result.success) {
      setModalFeedback({
        type: 'success',
        message: result.message,
      });
      refreshList();
      setTimeout(() => {
        setIsSubmitting(false);
        setSelectedStaff(null);
      }, 1400);
    } else {
      setIsSubmitting(false);
      setModalFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  // Filtered staff members
  const filteredStaff = useMemo(() => {
    return staffList.filter(staff => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = staff.fullName.toLowerCase().includes(query);
        const matchesId = staff.identifier.includes(query);
        const matchesSubject = staff.subjectName && staff.subjectName.toLowerCase().includes(query);
        const matchesRank = staff.rank.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesSubject && !matchesRank) {
          return false;
        }
      }

      // Role filter
      if (roleFilter === 'teachers' && staff.role !== 'teacher') return false;
      if (roleFilter === 'admin') {
        const isAdmin = staff.role === 'director' || staff.role === 'censor' ||
          ['مقتصد', 'مقتصدة', 'مستشار', 'مستشارة', 'عون إدارة', 'عون حفظ البيانات', 'كاتب', 'كاتبة'].some(k => staff.rank.includes(k));
        if (!isAdmin) return false;
      }
      if (roleFilter === 'supervisors') {
        if (!staff.rank.includes('مشرف')) return false;
      }
      if (roleFilter === 'workers') {
        if (!staff.rank.includes('عامل') && !staff.rank.includes('وقاية')) return false;
      }

      // Status filter
      if (statusFilter === 'configured' && !staff.hasCustomPin) return false;
      if (statusFilter === 'pending' && staff.hasCustomPin) return false;

      return true;
    });
  }, [staffList, searchQuery, roleFilter, statusFilter]);

  const totalStaff = staffList.length;
  const configuredCount = staffList.filter(s => s.hasCustomPin).length;
  const pendingCount = totalStaff - configuredCount;

  const teachersCount = useMemo(() => staffList.filter(s => s.role === 'teacher').length, [staffList]);
  const adminCount = useMemo(() => staffList.filter(s => s.role === 'director' || s.role === 'censor' || ['مقتصد', 'مقتصدة', 'مستشار', 'مستشارة', 'عون إدارة', 'عون حفظ البيانات', 'كاتب', 'كاتبة'].some(k => s.rank.includes(k))).length, [staffList]);
  const supervisorsCount = useMemo(() => staffList.filter(s => s.rank.includes('مشرف')).length, [staffList]);
  const workersCount = useMemo(() => staffList.filter(s => s.rank.includes('عامل') || s.rank.includes('وقاية')).length, [staffList]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner with Administrative Notice */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>لوحة تحكم حصرية لمدير المؤسسة</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <KeyRound className="w-6 h-6 text-emerald-400" />
                <span>إدارة حسابات وكلمات سر الطاقم التربوي والإداري</span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl leading-relaxed">
                بصفتك مدير {SCHOOL_NAME}، تتيح لك هذه اللوحة استعراض جميع حسابات الأساتذة والموظفين الرسمية (42 موظفاً)، الاطلاع على كلمات السر الحالية مباشرة، وتعديلها أو إعادة ضبطها بنقرة زر في حال نسيانها، دون الحاجة لأي إيميل أو انتظار.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllPasswords(!showAllPasswords)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  showAllPasswords
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                title="إظهار أو إخفاء جميع كلمات السر دفعة واحدة"
              >
                {showAllPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showAllPasswords ? 'إخفاء كافة كلمات السر' : 'إظهار كافة كلمات السر'}</span>
              </button>

              <button
                type="button"
                onClick={refreshList}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-emerald-200 block mb-0.5 font-medium">إجمالي الطاقم الرسمي</span>
              <span className="text-xl sm:text-2xl font-black text-white">{totalStaff}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-emerald-200 block mb-0.5 font-medium">حسابات بكلمة سر مفعلة</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{configuredCount}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center">
              <span className="text-[11px] text-amber-200 block mb-0.5 font-medium">بانتظار أول تسجيل دخول</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">{pendingCount}</span>
            </div>

            <div
              className={`backdrop-blur-md rounded-2xl p-3 border text-center transition-all ${
                pendingRequests.length > 0
                  ? 'bg-rose-500/25 border-rose-400/50 shadow-sm animate-pulse'
                  : 'bg-white/10 border-white/15'
              }`}
            >
              <span className="text-[11px] text-rose-200 block mb-0.5 font-medium">طلبات استرجاع معلقة</span>
              <span className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-1.5">
                {pendingRequests.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />}
                {pendingRequests.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Requests Section - Strictly Requires Director Approval */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                طلبات استرجاع وتفعيل كلمات السر (موافقة المدير الحصرية)
              </h3>
              {pendingRequests.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                  {pendingRequests.length} طلب جديد
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              حماية تامة من أي اختراق: عندما يطلب أي موظف تعيين كلمة سر جديدة، يتم تعليق دخوله تلقائياً حتى تقوم بمراجعة الطلب والموافقة عليه وتفعيله أدناه.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveRequestsTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRequestsTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              طلبات معلقة ({pendingRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveRequestsTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRequestsTab === 'history'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              سجل الطلبات السابقة ({historyRequests.length})
            </button>
          </div>
        </div>

        {/* Feedback Alert if action occurred */}
        {requestFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 animate-fadeIn ${
              requestFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                : 'bg-rose-50 text-rose-900 border border-rose-200 font-bold'
            }`}
          >
            <div className="flex items-center gap-2">
              {requestFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{requestFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setRequestFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending Requests List */}
        {activeRequestsTab === 'pending' && (
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="py-6 px-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-800 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">لا توجد أي طلبات استرجاع معلقة حالياً.</span>
                  كافة حسابات الأساتذة والموظفين مؤمنة وتعمل بنظام حماية كامل ضد أي محاولات اختراق.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingRequests.map(req => {
                  const isVisible = visibleReqPasswords[req.id];
                  const isLoading = actionLoadingId === req.id;

                  return (
                    <div
                      key={req.id}
                      className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 space-y-3 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <h4 className="font-bold text-slate-900 text-sm">{req.staffName}</h4>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {req.staffRank}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          بانتظار تفعيلك
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">الرقم المهني:</span>
                          <span className="font-mono font-bold text-slate-800 dir-ltr select-all">
                            {req.identifier}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">كلمة السر المطلوبة:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 dir-ltr">
                              {isVisible ? req.requestedPin : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleReqPassVisibility(req.id)}
                              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              title={isVisible ? 'إخفاء' : 'إظهار'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(req.requestedPin);
                                setRequestFeedback({
                                  type: 'success',
                                  message: 'تم نسخ كلمة السر المطلوبة بنجاح!',
                                });
                              }}
                              className="text-slate-400 hover:text-emerald-700 p-1 cursor-pointer"
                              title="نسخ كلمة السر"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {req.note && (
                          <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400 shrink-0">ملاحظة الموظف:</span>
                            <span className="text-slate-700 font-medium text-left">{req.note}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>تاريخ ووقت الطلب:</span>
                          </span>
                          <span dir="ltr">
                            {new Date(req.requestDate).toLocaleDateString('ar-DZ', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: 'numeric',
                              month: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleApproveRequest(req.id)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5" />
                          )}
                          <span>موافقة وتفعيل الدخول فوراً</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleRejectRequest(req.id)}
                          className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="رفض الطلب والإبقاء على كلمة السر السابقة لحماية الحساب من أي اختراق"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History Requests List */}
        {activeRequestsTab === 'history' && (
          <div className="space-y-2">
            {historyRequests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                لا يوجد سجل لطلبات سابقة معالجة.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyRequests.map(req => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{req.staffName}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status === 'approved' ? 'مقبول ومفعل' : 'مرفوض'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                        {req.identifier}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {req.resolvedAt
                          ? new Date(req.resolvedAt).toLocaleDateString('ar-DZ', {
                              day: 'numeric',
                              month: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(req.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="حذف من السجل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم واللقب، المادة (مثل: رياضيات، علوم)، أو بالرقم المهني..."
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكل ({totalStaff})
            </button>
            <button
              onClick={() => setRoleFilter('teachers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                roleFilter === 'teachers'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الأساتذة ({teachersCount})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                roleFilter === 'admin'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الإدارة والتوجيه والمقتصدية ({adminCount})
            </button>
            <button
              onClick={() => setRoleFilter('supervisors')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                roleFilter === 'supervisors'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              مشرفو التربية ({supervisorsCount})
            </button>
            <button
              onClick={() => setRoleFilter('workers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                roleFilter === 'workers'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              العمال المهنيون والوقاية ({workersCount})
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">حالة كلمة السر:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              الجميع ({totalStaff})
            </button>
            <button
              onClick={() => setStatusFilter('configured')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'configured'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              تم تفعيل كلمة السر ({configuredCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              بانتظار أول دخول ({pendingCount})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            عرض {filteredStaff.length} من أصل {totalStaff}
          </span>
        </div>
      </div>

      {/* Staff Accounts List / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              قائمة أرقام التعريف المهنية وكلمات السر الرسمية
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            اضغط على رمز العين 👁️ لإظهار كلمة السر وقراءتها بوضوح
          </span>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-sm">لم يتم العثور على أي موظف يطابق معايير البحث.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-emerald-700 hover:underline font-bold"
            >
              إعادة ضبط معايير البحث
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStaff.map((staff, idx) => {
              const isPasswordVisible = showAllPasswords || Boolean(visiblePasswords[staff.identifier]);
              const currentPin = staff.pin;
              const hasPin = Boolean(currentPin && currentPin.trim().length >= 4);

              return (
                <div
                  key={staff.identifier}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left (RTL: Right): Staff Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm sm:text-base">
                          {staff.fullName}
                        </span>

                        {/* Exact Official Rank Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                            staff.role === 'director'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : staff.role === 'censor'
                              ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                              : staff.rank.includes('مقتصد')
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : staff.rank.includes('مستشار')
                              ? 'bg-purple-100 text-purple-950 border-purple-300'
                              : staff.rank.includes('مشرف')
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : staff.rank.includes('إدارة') || staff.rank.includes('بيانات') || staff.rank.includes('كاتب')
                              ? 'bg-teal-100 text-teal-950 border-teal-300'
                              : staff.rank.includes('عامل') || staff.rank.includes('وقاية')
                              ? 'bg-amber-50 text-amber-950 border-amber-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {staff.rank}
                        </span>

                        {staff.subjectName && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                            مادة {staff.subjectName}
                          </span>
                        )}
                      </div>

                      {/* 16-Digit Professional Number */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">الرقم المهني:</span>
                        <span
                          className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tracking-wider text-xs"
                          dir="ltr"
                        >
                          {staff.identifier}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(staff.identifier, 'id', staff.identifier)}
                          className="p-1 text-slate-400 hover:text-emerald-700 transition-colors"
                          title="نسخ الرقم المهني"
                        >
                          {copiedId === staff.identifier ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right (RTL: Left): Password Credentials & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Password display block */}
                    <div className="bg-slate-100/90 rounded-2xl p-2 sm:px-3 sm:py-2 border border-slate-200 flex items-center justify-between gap-2 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Lock className={`w-3.5 h-3.5 ${hasPin ? 'text-emerald-700' : 'text-amber-600'}`} />
                        <span className="text-[11px] text-slate-500 font-medium">كلمة السر:</span>
                        
                        {hasPin ? (
                          <span
                            className="font-mono font-black text-slate-900 text-xs sm:text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-slate-200"
                            dir="ltr"
                          >
                            {isPasswordVisible ? currentPin : '••••••••'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            بانتظار أول دخول
                          </span>
                        )}
                      </div>

                      {hasPin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(staff.identifier)}
                            className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"
                            title={isPasswordVisible ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyText(currentPin!, 'pass', staff.identifier)}
                            className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"
                            title="نسخ كلمة السر"
                          >
                            {copiedPass === staff.identifier ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openResetModal(staff)}
                        className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all shrink-0"
                        title="تغيير أو إعادة تعيين كلمة السر لهذا الموظف"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{hasPin ? 'تعديل كلمة السر' : 'تعيين كلمة سر مسبقة'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyFullCredentialsCard(staff)}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all shrink-0"
                        title="نسخ بطاقة الدخول كاملة لتسليمها للأستاذ"
                      >
                        {copiedCard === staff.identifier ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">نسخ البطاقة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Set / Reset Staff Password */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">تعديل كلمة السر للموظف</h3>
                  <p className="text-[11px] text-emerald-200">إدارة متوسطة الشهيد بن نعمة مصطفى</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNewPassword} className="p-5 space-y-4">
              {/* Selected Staff Info Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">اسم الأستاذ/الموظف:</span>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{selectedStaff.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">الرتبة والمادة:</span>
                  <span className="text-xs text-emerald-800 font-semibold">
                    {selectedStaff.rank} {selectedStaff.subjectName ? `(${selectedStaff.subjectName})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">الرقم المهني:</span>
                  <span className="font-mono text-xs font-bold text-slate-800" dir="ltr">
                    {selectedStaff.identifier}
                  </span>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  أدخل كلمة السر الجديدة (من 4 خانات فما فوق):
                </label>
                <div className="relative">
                  <input
                    type={showModalPass ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    placeholder="مثال: 123456 أو كلمة سر خاصة بالأستاذ"
                    className="w-full pr-3.5 pl-10 py-2.5 rounded-2xl border border-slate-300 text-sm font-mono outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPass(!showModalPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showModalPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  يمكن للأستاذ تسجيل الدخول بهذه الكلمة فوراً، وتغييرها لاحقاً من حسابه إن رغب.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">اقتراحات سريعة لكلمة السر:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput('123456')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium"
                  >
                    123456
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput('20252026')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium"
                  >
                    20252026
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(selectedStaff.identifier.substring(0, 6))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium"
                  >
                    أول 6 أرقام مهنية
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {modalFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    modalFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {modalFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{modalFeedback.message}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتفعيل كلمة السر الآن'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
