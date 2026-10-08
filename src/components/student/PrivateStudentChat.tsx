import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCheck,
  Download,
  Eye,
  FileText,
  FileUp,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Lock,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  createOrGetPrivateConversation,
  deletePrivateConversation,
  getClassmatesForStudent,
  getLocalPrivateMessages,
  getPrivateConversations,
  sendPrivateMessage,
} from '../../services/storageService';
import {
  initPrivateConversationsSync,
  initPrivateMessagesSync,
} from '../../services/firestoreService';
import { FileFormat, PrivateConversation, PrivateMessage, UserProfile } from '../../types';
import { processAndCompressFile } from '../../utils/fileCompressor';

interface PrivateStudentChatProps {
  currentUser: UserProfile;
}

export const PrivateStudentChat: React.FC<PrivateStudentChatProps> = ({ currentUser }) => {
  const studentClassId = currentUser.classId || '2AM-2';
  const studentClassName = currentUser.className || 'القسم الدراسي';

  // Conversations & active state
  const [conversations, setConversations] = useState<PrivateConversation[]>(() =>
    getPrivateConversations(currentUser.identifier)
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    const list = getPrivateConversations(currentUser.identifier);
    return list.length > 0 ? list[0].id : null;
  });

  // Messages in active conversation
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Attachment state
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
    format: FileFormat;
    dataUrl: string;
  } | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatTypeMode, setChatTypeMode] = useState<'single' | 'group'>('single');
  const [selectedClassmates, setSelectedClassmates] = useState<UserProfile[]>([]);
  const [groupTitleInput, setGroupTitleInput] = useState('');
  const [classmateSearch, setClassmateSearch] = useState('');

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Classmates in the student's class
  const classmates = useMemo(() => {
    return getClassmatesForStudent(studentClassId, currentUser.identifier);
  }, [studentClassId, currentUser.identifier]);

  // Filtered classmates for new chat search
  const filteredClassmates = useMemo(() => {
    if (!classmateSearch.trim()) return classmates;
    const q = classmateSearch.trim().toLowerCase();
    return classmates.filter(c => c.name.toLowerCase().includes(q));
  }, [classmates, classmateSearch]);

  // Current active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId) || null;
  }, [conversations, activeConvId]);

  // Realtime Cloud + Local Sync for Conversations
  useEffect(() => {
    const unsubscribeCloud = initPrivateConversationsSync(
      currentUser.identifier,
      (cloudConvs: PrivateConversation[]) => {
        if (cloudConvs && cloudConvs.length > 0) {
          setConversations(cloudConvs);
        }
      }
    );

    const handleLocalConvChange = () => {
      setConversations(getPrivateConversations(currentUser.identifier));
    };

    window.addEventListener('private-conversations-change', handleLocalConvChange);

    return () => {
      unsubscribeCloud();
      window.removeEventListener('private-conversations-change', handleLocalConvChange);
    };
  }, [currentUser.identifier]);

  // Realtime Cloud + Local Sync for Messages of Active Conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    // 1. Initial local load
    setMessages(getLocalPrivateMessages(activeConvId));

    // 2. Fetch from server
    fetch(`/api/conversations/${encodeURIComponent(activeConvId)}/messages?studentId=${encodeURIComponent(currentUser.identifier)}`)
      .then(res => res.json())
      .then(serverMsgs => {
        if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
          setMessages(serverMsgs);
        }
      })
      .catch(() => {});

    // 3. Firestore Realtime Sync
    const unsubscribeCloud = initPrivateMessagesSync(activeConvId, (cloudMsgs: PrivateMessage[]) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessages(cloudMsgs);
      }
    });

    // 4. Local Event listener
    const handleLocalMsgChange = () => {
      setMessages(getLocalPrivateMessages(activeConvId));
    };
    window.addEventListener('private-messages-change', handleLocalMsgChange);

    return () => {
      unsubscribeCloud();
      window.removeEventListener('private-messages-change', handleLocalMsgChange);
    };
  }, [activeConvId, currentUser.identifier]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation) return;
    if (!inputText.trim() && !attachedFile) return;

    setSending(true);
    const content = inputText.trim();
    const file = attachedFile;

    setInputText('');
    setAttachedFile(null);

    try {
      await sendPrivateMessage({
        conversationId: activeConversation.id,
        senderId: currentUser.identifier,
        senderName: currentUser.name,
        content: content || (file ? `📎 مرفق: ${file.name}` : ''),
        fileName: file?.name,
        fileSize: file?.size,
        fileFormat: file?.format,
        fileDataUrl: file?.dataUrl,
      });
    } catch (err) {
      console.error('Error sending private message:', err);
    } finally {
      setSending(false);
    }
  };

  // Handle File Upload for Chat Attachment
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('حجم الملف كبير جداً، يرجى اختيار ملف أو صورة أقل من 15 ميغابايت.');
      return;
    }

    try {
      setAttachLoading(true);
      const processed = await processAndCompressFile(file);
      setAttachedFile({
        name: processed.name,
        size: processed.sizeFormatted,
        format: processed.format as FileFormat,
        dataUrl: processed.dataUrl,
      });
    } catch {
      alert('تعذر قراءة الملف، يرجى المحاولة مرة أخرى.');
    } finally {
      setAttachLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Start Single Chat
  const handleStartSingleChat = (classmate: UserProfile) => {
    const conv = createOrGetPrivateConversation(currentUser, [classmate]);
    setActiveConvId(conv.id);
    setShowNewChatModal(false);
    setShowMobileChat(true);
  };

  // Handle Start Group Chat
  const handleStartGroupChat = () => {
    if (selectedClassmates.length === 0) return;
    const conv = createOrGetPrivateConversation(currentUser, selectedClassmates, groupTitleInput);
    setActiveConvId(conv.id);
    setSelectedClassmates([]);
    setGroupTitleInput('');
    setShowNewChatModal(false);
    setShowMobileChat(true);
  };

  // Toggle classmate selection in group mode
  const toggleSelectClassmate = (c: UserProfile) => {
    if (selectedClassmates.some(item => item.identifier === c.identifier)) {
      setSelectedClassmates(selectedClassmates.filter(item => item.identifier !== c.identifier));
    } else {
      setSelectedClassmates([...selectedClassmates, c]);
    }
  };

  // Handle Delete Conversation
  const handleDeleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذه المحادثة الخاصة؟ سيتم حذفها من جهازك.')) {
      deletePrivateConversation(convId);
      if (activeConvId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
        setShowMobileChat(false);
      }
    }
  };

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'اليوم';
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'أمس';
      return d.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Helper to get conversation display title
  const getConvTitle = (conv: PrivateConversation) => {
    if (conv.title) return conv.title;
    if (conv.isGroup) {
      return `مجموعة (${conv.participantIds.length} تلاميذ)`;
    }
    const otherId = conv.participantIds.find(id => id !== currentUser.identifier);
    return (otherId && conv.participantNames?.[otherId]) || 'زميل دراسي';
  };

  // Helper to get initials
  const getInitials = (name?: string) => {
    if (!name) return 'ت';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return parts[0][0] || 'ت';
  };

  return (
    <div className="space-y-4">
      {/* Supervision & Classmate Privacy Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                <span>محادثات الزملاء المباشرة (1 لـ 1 ومجموعات)</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  مراقبة تربوياً من طرف المدير والناظر ⚖️
                </span>
              </h3>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed mt-0.5">
              تتيح لك التحدث مع الزميل الذي تختاره فقط (أو عدة زملاء) لتبادل الدروس دون اطلاع بقية تلاميذ القسم، مع خضوعها للإشراف والرقابة التربوية الرسمية للمدير والناظر لحماية الانضباط المدرسي.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedClassmates([]);
            setGroupTitleInput('');
            setChatTypeMode('single');
            setClassmateSearch('');
            setShowNewChatModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>بدء محادثة دراسية مع زميل</span>
        </button>
      </div>

      {/* Main Chat Layout Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex h-[620px] relative">
        {/* ================= COLUMN 1: CONVERSATIONS LIST ================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-l border-slate-200 flex flex-col shrink-0 bg-slate-50/70 transition-all ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Filter */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800">محادثاتي الخاصة</h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedClassmates([]);
                  setChatTypeMode('single');
                  setClassmateSearch('');
                  setShowNewChatModal(true);
                }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>محادثة جديدة</span>
              </button>
            </div>

            {/* Quick Classmates Count badge */}
            <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>قسمك الدراسي: <strong>{studentClassName}</strong></span>
              </span>
              <span className="text-emerald-700 font-bold">
                {classmates.length} زميلاً متاحاً
              </span>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-700">لا توجد محادثات سرية نشطة حالياً</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ابدأ محادثة خاصة الآن مع أي زميل ترغب في التحدث معه أو دراسة الدروس معاً.
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                >
                  اختر زميلاً للتحدث معه 💬
                </button>
              </div>
            ) : (
              conversations.map(conv => {
                const isActive = conv.id === activeConvId;
                const title = getConvTitle(conv);
                const lastMsg = conv.lastMessage || 'محادثة خاصة جديدة';
                const timeStr = conv.lastMessageAt ? formatTime(conv.lastMessageAt) : '';

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowMobileChat(true);
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-2.5 group ${
                      isActive
                        ? 'bg-emerald-50/80 border-r-4 border-r-emerald-700'
                        : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                            conv.isGroup
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {conv.isGroup ? (
                            <Users className="w-5 h-5 text-purple-700" />
                          ) : (
                            getInitials(title)
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white">
                          🔒
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {title}
                          </h5>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {timeStr}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          {conv.lastSenderName && conv.isGroup && (
                            <span className="font-semibold text-slate-600">
                              {conv.lastSenderName}:
                            </span>
                          )}
                          <span>{lastMsg}</span>
                        </p>
                      </div>
                    </div>

                    {/* Delete Action button on hover */}
                    <button
                      onClick={e => handleDeleteConversation(e, conv.id)}
                      title="حذف المحادثة"
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

        {/* ================= COLUMN 2: ACTIVE CHAT WINDOW ================= */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/40 min-w-0 h-full ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 shrink-0"
                    title="الرجوع للقائمة"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  {/* Participant Avatar */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      activeConversation.isGroup
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {activeConversation.isGroup ? (
                      <Users className="w-4 h-4 text-purple-700" />
                    ) : (
                      getInitials(getConvTitle(activeConversation))
                    )}
                  </div>

                  {/* Title and participants */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                        {getConvTitle(activeConversation)}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold shrink-0">
                        <Shield className="w-2.5 h-2.5 text-amber-700" />
                        <span>مراقبة تربوياً</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <span>المشاركون:</span>
                      <span className="font-semibold text-slate-700">
                        {Object.values(activeConversation.participantNames || {}).join('، ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={e => handleDeleteConversation(e, activeConversation.id)}
                    title="حذف المحادثة"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-100/50 to-white">
                {/* Supervision Badge */}
                <div className="text-center my-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>محادثة موجهة بين الزملاء المحددين • خاضعة للمتابعة والرقابة الإدارية للمدير والناظر ⚖️</span>
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-600">
                      ابدأ الدردشة وتبادل الدروس مع زميلك
                    </div>
                    <p className="text-[11px] text-slate-400">
                      اكتب رسالة أو أرفق صورة كراس أو ورقة واجبات دراسية بالأسفل.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser.identifier;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Sender Name in group chats */}
                        {!isMe && activeConversation.isGroup && (
                          <span className="text-[10px] font-bold text-slate-500 mr-2">
                            {msg.senderName}
                          </span>
                        )}

                        {/* Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-2xs transition-all ${
                            isMe
                              ? 'bg-emerald-700 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                          }`}
                        >
                          {/* Text Content */}
                          {msg.content && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text font-normal">
                              {msg.content}
                            </p>
                          )}

                          {/* File / Image Attachment */}
                          {msg.fileName && msg.fileDataUrl && (
                            <div className="mt-2.5 pt-2 border-t border-white/20">
                              {msg.fileFormat === 'image' ||
                              msg.fileDataUrl.startsWith('data:image/') ? (
                                <div className="space-y-1.5">
                                  <div
                                    onClick={() =>
                                      setPreviewImage({
                                        url: msg.fileDataUrl!,
                                        name: msg.fileName!,
                                      })
                                    }
                                    className="cursor-pointer overflow-hidden rounded-xl border border-white/20 max-h-48 group relative"
                                  >
                                    <img
                                      src={msg.fileDataUrl}
                                      alt={msg.fileName}
                                      className="w-full object-cover group-hover:scale-102 transition-transform"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                                      <Eye className="w-4 h-4" />
                                      <span>تكبير الصورة</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] opacity-90">
                                    <span className="truncate max-w-[180px]">{msg.fileName}</span>
                                    <a
                                      href={msg.fileDataUrl}
                                      download={msg.fileName}
                                      className={`font-bold hover:underline flex items-center gap-1 ${
                                        isMe ? 'text-white' : 'text-emerald-700'
                                      }`}
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>تحميل</span>
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                /* Non-image attachment (PDF, Word, etc.) */
                                <div
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border ${
                                    isMe
                                      ? 'bg-emerald-800/80 border-emerald-600 text-white'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-5 h-5 text-amber-300 shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">
                                        {msg.fileName}
                                      </div>
                                      <div className="text-[10px] opacity-75">
                                        {msg.fileSize || 'ملف دراسي'} •{' '}
                                        {(msg.fileFormat || 'doc').toUpperCase()}
                                      </div>
                                    </div>
                                  </div>

                                  <a
                                    href={msg.fileDataUrl}
                                    download={msg.fileName}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-colors ${
                                      isMe
                                        ? 'bg-white text-emerald-900 hover:bg-emerald-50'
                                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                                    }`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>تحميل</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer with Timestamp */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isMe ? 'text-emerald-200' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0">
                {/* Attachment Preview Bar */}
                {attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-emerald-700">({attachedFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* File Attachment Hidden Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileAttach}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  {/* Attach Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachLoading || sending}
                    className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 transition-colors shrink-0"
                    title="إرفاق صورة أو كراس أو ملف"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="اكتب رسالتك السرية لزميلك هنا..."
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 outline-none text-xs sm:text-sm text-slate-800 transition-all placeholder:text-slate-400"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || sending || attachLoading}
                    className="p-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all shrink-0 active:scale-95 shadow-xs"
                    title="إرسال"
                  >
                    <Send className="w-5 h-5 rtl:rotate-180" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* No conversation selected placeholder */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-extrabold text-slate-800">
                  فضاء المحادثات الخاصة المشفرة بين الزملاء
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  اختر زميلاً من القائمة الجانبية أو ابدأ محادثة جديدة سرية مع أي تلميذ في قسمك الدراسي (أو عدة تلاميذ).
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedClassmates([]);
                  setChatTypeMode('single');
                  setClassmateSearch('');
                  setShowNewChatModal(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>بدء محادثة جديدة الآن</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: START NEW PRIVATE CONVERSATION ================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    بدء محادثة خاصة وسرية جديدة
                  </h3>
                  <p className="text-xs text-emerald-100">
                    قسمك: {studentClassName} ({classmates.length} زميلاً)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector: 1-on-1 vs Group */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
              <div className="flex rounded-2xl bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setChatTypeMode('single');
                    setSelectedClassmates([]);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    chatTypeMode === 'single'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>محادثة ثنائية مع زميل محدد (1 لـ 1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatTypeMode('group');
                    setSelectedClassmates([]);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    chatTypeMode === 'group'
                      ? 'bg-white text-purple-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>مجموعة خاصة (عدة زملاء)</span>
                </button>
              </div>

              {/* Group Title input if group mode */}
              {chatTypeMode === 'group' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    عنوان المجموعة (اختياري، مثلاً: فوج الرياضيات، مشروع العلوم):
                  </label>
                  <input
                    type="text"
                    value={groupTitleInput}
                    onChange={e => setGroupTitleInput(e.target.value)}
                    placeholder="مثال: مجموعة حل التمارين والمراجعة"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-purple-600 outline-none"
                  />
                  <div className="text-[11px] text-purple-700 font-semibold">
                    المحددون حالياً: {selectedClassmates.length} زملاء
                  </div>
                </div>
              )}

              {/* Search Classmates Input */}
              <div className="relative">
                <input
                  type="text"
                  value={classmateSearch}
                  onChange={e => setClassmateSearch(e.target.value)}
                  placeholder="ابحث عن زميلك بالاسم واللقب..."
                  className="w-full pl-8 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-600 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                {classmateSearch && (
                  <button
                    onClick={() => setClassmateSearch('')}
                    className="text-slate-400 hover:text-slate-600 absolute left-2.5 top-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Classmates List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 max-h-72">
              {filteredClassmates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لم يتم العثور على أي زميل مطابق للبحث.
                </div>
              ) : (
                filteredClassmates.map(c => {
                  const isSelected = selectedClassmates.some(
                    item => item.identifier === c.identifier
                  );

                  return (
                    <div
                      key={c.identifier}
                      onClick={() => {
                        if (chatTypeMode === 'single') {
                          handleStartSingleChat(c);
                        } else {
                          toggleSelectClassmate(c);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-50 border border-purple-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-400">
                            رقم التعريف: {c.identifier}
                          </div>
                        </div>
                      </div>

                      {chatTypeMode === 'single' ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl hover:bg-emerald-100 transition-colors">
                          بدء المحادثة 💬
                        </span>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            {chatTypeMode === 'group' && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  تم تحديد {selectedClassmates.length} زملاء
                </span>
                <button
                  onClick={handleStartGroupChat}
                  disabled={selectedClassmates.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs shadow-xs transition-all"
                >
                  إنشاء المحادثة الجماعية وبدء الدردشة 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: IMAGE PREVIEW ================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
          >
            <div className="p-3 bg-slate-950/80 flex items-center justify-between text-white border-b border-slate-800">
              <span className="text-xs font-bold truncate">{previewImage.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.name}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل</span>
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
