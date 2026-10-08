import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Info,
  Lock,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { SCHOOL_CLASSES } from '../../data/mockData';
import {
  deletePrivateConversation,
  deleteSupervisedMessage,
  getSupervisedConversations,
  getSupervisedMessages,
} from '../../services/storageService';
import { PrivateConversation, PrivateMessage, UserProfile } from '../../types';

interface StudentChatSupervisionPanelProps {
  currentUser: UserProfile; // Director or Censor
  onIssueSummon?: (studentId: string, studentName: string, classId: string) => void;
}

export const StudentChatSupervisionPanel: React.FC<StudentChatSupervisionPanelProps> = ({
  currentUser,
  onIssueSummon,
}) => {
  const role = currentUser.role as 'director' | 'censor';
  const roleTitle = role === 'director' ? 'السيد مدير المؤسسة' : 'السيد ناظر المؤسسة';

  // State
  const [conversations, setConversations] = useState<PrivateConversation[]>(() =>
    getSupervisedConversations()
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load conversations from server / local storage
  const reloadConversations = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/conversations?role=${role}`);
      if (res.ok) {
        const data: PrivateConversation[] = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      } else {
        setConversations(getSupervisedConversations());
      }
    } catch {
      setConversations(getSupervisedConversations());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    reloadConversations();

    const handleEvent = () => reloadConversations();
    window.addEventListener('private-conversations-change', handleEvent);
    return () => window.removeEventListener('private-conversations-change', handleEvent);
  }, [role]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    getSupervisedMessages(selectedConvId, role).then(msgs => {
      setMessages(msgs);
      setLoadingMessages(false);
    });

    const handleMsgEvent = () => {
      getSupervisedMessages(selectedConvId, role).then(setMessages);
    };
    window.addEventListener('private-messages-change', handleMsgEvent);
    return () => window.removeEventListener('private-messages-change', handleMsgEvent);
  }, [selectedConvId, role]);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      if (selectedClassId !== 'ALL' && c.classId !== selectedClassId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const lastMsgMatch = (c.lastMessage || '').toLowerCase().includes(q);
        const namesMatch = Object.values(c.participantNames || {}).some(name =>
          name.toLowerCase().includes(q)
        );
        if (!titleMatch && !lastMsgMatch && !namesMatch) return false;
      }
      return true;
    });
  }, [conversations, selectedClassId, searchQuery]);

  // Active conversation object
  const activeConv = useMemo(() => {
    return conversations.find(c => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Handle delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedConvId) return;
    if (window.confirm('هل أنت متأكد من حذف هذه الرسالة المخالفة من سجل المحادثة؟')) {
      await deleteSupervisedMessage(selectedConvId, msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  // Handle delete entire conversation
  const handleDeleteConversation = (convId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟ سيتم مسحها نهائياً.')) {
      deletePrivateConversation(convId);
      if (selectedConvId === convId) {
        setSelectedConvId(null);
      }
      setConversations(prev => prev.filter(c => c.id !== convId));
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('ar-DZ')} • ${d.toLocaleTimeString('ar-DZ', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Supervision Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-teal-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              <span>نظام الرقابة التربوية والمتابعة الإدارية • {roleTitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>سجل مراقبة محادثات التلاميذ المباشرة</span>
              <span className="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full font-mono">
                {conversations.length} محادثة مسجلة
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-3xl leading-relaxed">
              تتيح هذه اللوحة للإدارة المدرسية الاطلاع المستمر والتدقيق في كافة المحادثات الثنائية والجماعية القائمة بين التلاميذ، لضمان سلامتهم وتوجيههم، ورصد أي تجاوزات انضباطية والتدخل الفوري عند الحاجة.
            </p>
          </div>

          <button
            onClick={reloadConversations}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-2 transition-all shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث السجل اللحظي</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 mb-1">إجمالي المحادثات</div>
          <div className="text-2xl font-black text-slate-900">{conversations.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 mb-1">المحادثات الثنائية (1 لـ 1)</div>
          <div className="text-2xl font-black text-teal-700">
            {conversations.filter(c => !c.isGroup).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 mb-1">المجموعات المدرسية</div>
          <div className="text-2xl font-black text-purple-700">
            {conversations.filter(c => c.isGroup).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 mb-1">الأقسام المشمولة</div>
          <div className="text-2xl font-black text-emerald-700">
            {new Set(conversations.map(c => c.classId)).size} أقسام
          </div>
        </div>
      </div>

      {/* Main Monitoring Interface */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex h-[640px]">
        {/* Left / List Column */}
        <div className="w-full md:w-96 border-l border-slate-200 flex flex-col shrink-0 bg-slate-50/70">
          {/* Filters Bar */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث باسم التلميذ أو نص الرسالة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-teal-600 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 absolute left-2.5 top-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedClassId('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedClassId === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                جميع الأقسام ({conversations.length})
              </button>
              {SCHOOL_CLASSES.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedClassId === cls.id
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cls.id}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Shield className="w-8 h-8 text-slate-300 mx-auto" />
                <div>لا توجد محادثات مسجلة مطابقة للبحث أو القسم المحدد</div>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === selectedConvId;
                const participantsList = Object.values(conv.participantNames || {}).join(' و ');

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-3 group ${
                      isSelected
                        ? 'bg-teal-50 border-r-4 border-r-teal-700'
                        : 'hover:bg-slate-100 bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {conv.title || participantsList}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold shrink-0">
                          {conv.classId}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{participantsList}</span>
                      </div>

                      <div className="text-[11px] text-slate-600 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {conv.lastSenderName && (
                          <span className="font-bold text-slate-800 ml-1">
                            {conv.lastSenderName}:
                          </span>
                        )}
                        <span>{conv.lastMessage || 'محادثة قيد النشاط'}</span>
                      </div>

                      <div className="text-[9px] text-slate-400 font-mono">
                        {formatDateTime(conv.updatedAt || conv.createdAt)}
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      title="حذف المحادثة إدارياً"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right / Audit Transcript Column */}
        <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0 h-full">
          {activeConv ? (
            <>
              {/* Transcript Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">
                      {activeConv.title || 'تدقيق المحادثة'}
                    </h3>
                    <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full">
                      قسم {activeConv.classId}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>تدقيق الإدارة</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    أطراف المحادثة: {Object.values(activeConv.participantNames || {}).join(' • ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteConversation(activeConv.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المحادثة بالكامل</span>
                  </button>
                </div>
              </div>

              {/* Message Transcript Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-100/60 to-white">
                <div className="text-center my-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200/80 text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>سجل التدقيق والمتابعة الإدارية - متوسطة الشهيد بن نعمة مصطفى</span>
                  </span>
                </div>

                {loadingMessages ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    جاري تحميل سجل الرسائل...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs space-y-1">
                    <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>لا توجد رسائل مسجلة في هذه المحادثة حتى الآن.</div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2 group hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                            {msg.senderName?.[0] || 'ت'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900">
                              {msg.senderName}
                            </span>
                            <span className="text-[10px] text-slate-400 mr-2 font-mono">
                              ({msg.senderId})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTime(msg.createdAt)}
                          </span>

                          {/* Delete Message Button */}
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="حذف الرسالة المخالفة"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                        {msg.content}
                      </p>

                      {/* Attachment if present */}
                      {msg.fileName && msg.fileDataUrl && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                            <span className="font-bold truncate text-slate-800">{msg.fileName}</span>
                            <span className="text-[10px] text-slate-500">({msg.fileSize || 'ملف'})</span>
                          </div>

                          <a
                            href={msg.fileDataUrl}
                            download={msg.fileName}
                            className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                          >
                            <Download className="w-3 h-3" />
                            <span>معاينة / تحميل</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <ShieldCheck className="w-12 h-12 text-teal-600/40" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">اختر محادثة لعرض تفاصيلها</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  انقر على أي محادثة في القائمة الجانبية لعرض نص الرسائل والمرفقات والتدقيق فيها.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
