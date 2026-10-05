import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileText,
  HardDrive,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { STORAGE_KEYS, syncWithServer } from '../../services/storageService';

interface DatabaseDebugViewProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

interface StorageKeyMeta {
  key: string;
  label: string;
  iconName: string;
  itemCount: number;
  sizeBytes: number;
  sizeFormatted: string;
  rawString: string | null;
  parsedData: any;
  isValidJson: boolean;
}

export const DatabaseDebugView: React.FC<DatabaseDebugViewProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<string>('ben_naama_documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [serverState, setServerState] = useState<{
    online: boolean;
    serverTime?: string;
    documentsCount?: number;
    announcementsCount?: number;
    summonsCount?: number;
    peerExchangesCount?: number;
    notificationsCount?: number;
    rawServerData?: any;
  }>({ online: false });

  // Read all localStorage data
  const [storageData, setStorageData] = useState<StorageKeyMeta[]>([]);
  const [totalStorageBytes, setTotalStorageBytes] = useState<number>(0);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const readStorage = () => {
    if (typeof window === 'undefined') return;

    const monitoredKeys = [
      { key: STORAGE_KEYS.DOCUMENTS, label: 'الوثائق والملفات (Documents)' },
      { key: STORAGE_KEYS.ANNOUNCEMENTS, label: 'الإعلانات الرسمية (Announcements)' },
      { key: STORAGE_KEYS.SUMMONS, label: 'استدعاءات الأولياء (Summons)' },
      { key: STORAGE_KEYS.PEER_EXCHANGES, label: 'قناة الزملاء (Peer Exchanges)' },
      { key: STORAGE_KEYS.NOTIFICATIONS, label: 'التنبيهات والإشعارات (Notifications)' },
      { key: STORAGE_KEYS.USERS, label: 'المستخدمون المعتمدون (Users)' },
      { key: STORAGE_KEYS.CURRENT_USER, label: 'المستخدم الحالي (Current User)' },
    ];

    let totalBytes = 0;
    const metaList: StorageKeyMeta[] = [];

    // Collect defined keys
    for (const item of monitoredKeys) {
      const raw = localStorage.getItem(item.key);
      const bytes = raw ? new Blob([raw]).size : 0;
      totalBytes += bytes;

      let parsed: any = null;
      let isValid = false;
      let count = 0;

      if (raw) {
        try {
          parsed = JSON.parse(raw);
          isValid = true;
          if (Array.isArray(parsed)) {
            count = parsed.length;
          } else if (parsed && typeof parsed === 'object') {
            count = Object.keys(parsed).length;
          } else {
            count = 1;
          }
        } catch {
          isValid = false;
        }
      }

      metaList.push({
        key: item.key,
        label: item.label,
        iconName: item.key.includes('doc') ? 'FileText' : 'Database',
        itemCount: count,
        sizeBytes: bytes,
        sizeFormatted: formatBytes(bytes),
        rawString: raw,
        parsedData: parsed,
        isValidJson: isValid,
      });
    }

    // Check for any other keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !monitoredKeys.some(m => m.key === k)) {
        const raw = localStorage.getItem(k);
        const bytes = raw ? new Blob([raw]).size : 0;
        totalBytes += bytes;
        let parsed: any = null;
        let isValid = false;
        try {
          parsed = raw ? JSON.parse(raw) : null;
          isValid = true;
        } catch {
          isValid = false;
        }

        metaList.push({
          key: k,
          label: `مفتاح إضافي: ${k}`,
          iconName: 'Database',
          itemCount: Array.isArray(parsed) ? parsed.length : 1,
          sizeBytes: bytes,
          sizeFormatted: formatBytes(bytes),
          rawString: raw,
          parsedData: parsed,
          isValidJson: isValid,
        });
      }
    }

    setStorageData(metaList);
    setTotalStorageBytes(totalBytes);
  };

  const fetchServerState = async () => {
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setServerState({
            online: true,
            serverTime: data.serverTime,
            documentsCount: Array.isArray(data.documents) ? data.documents.length : 0,
            announcementsCount: Array.isArray(data.announcements) ? data.announcements.length : 0,
            summonsCount: Array.isArray(data.summons) ? data.summons.length : 0,
            peerExchangesCount: Array.isArray(data.peerExchanges) ? data.peerExchanges.length : 0,
            notificationsCount: Array.isArray(data.notifications) ? data.notifications.length : 0,
            rawServerData: data,
          });
          return;
        }
      }
      setServerState({ online: false });
    } catch {
      setServerState({ online: false });
    }
  };

  useEffect(() => {
    if (isOpen) {
      readStorage();
      fetchServerState();
    }
  }, [isOpen]);

  // Handle immediate sync trigger
  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('جارٍ المزامنة الثنائية مع الخادم المركزي...');
    try {
      await syncWithServer();
      await fetchServerState();
      readStorage();
      if (onRefreshData) onRefreshData();
      setSyncStatusMsg('تمت المزامنة بنجاح وتحديث كافة البيانات في الذاكرة.');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch {
      setSyncStatusMsg('تعذر الاتصال بالخادم المركزي حالياً.');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy JSON content to clipboard
  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export all storage as JSON file
  const handleExportBackup = () => {
    const fullSnapshot: Record<string, any> = {};
    for (const item of storageData) {
      fullSnapshot[item.key] = item.parsedData ?? item.rawString;
    }

    const blob = new Blob([JSON.stringify(fullSnapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ben_naama_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear and rebuild local cache from server
  const handleClearAndResync = async () => {
    if (!window.confirm('هل تريد إعادة تفريغ الذاكرة المؤقتة وإعادة استرجاع أحدث نسخة نقية من قاعدة بيانات الخادم؟')) {
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(STORAGE_KEYS.SUMMONS);
    localStorage.removeItem(STORAGE_KEYS.PEER_EXCHANGES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);

    readStorage();
    await handleForceSync();
  };

  // Current selected tab meta
  const currentMeta = storageData.find(m => m.key === activeTab);

  // Filtered view of data if search is applied
  const formattedContent = useMemo(() => {
    if (activeTab === '__SERVER__') {
      return JSON.stringify(serverState.rawServerData || {}, null, 2);
    }

    if (!currentMeta) return 'لا توجد بيانات';
    if (!currentMeta.rawString) return 'مفتاح التخزين فارغ حالياً (null).';

    try {
      const parsed = JSON.parse(currentMeta.rawString);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(item =>
            JSON.stringify(item).toLowerCase().includes(q)
          );
          return JSON.stringify(filtered, null, 2);
        }
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return currentMeta.rawString;
    }
  }, [activeTab, currentMeta, serverState.rawServerData, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-right font-['Cairo',sans-serif]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-white">
                  فحص ومراقبة قاعدة البيانات (Database Debug View)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  لوحة تشخيص الإدارة
                </span>
              </div>
              <p className="text-xs text-slate-300">
                عرض البيانات الخام المخزنة في المتصفح (localStorage) ومقارنتها فورياً مع الخادم المركزي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              title="مزامنة فورية الآن"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">مزامنة فورية</span>
            </button>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner if active */}
        {syncStatusMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          </div>
        )}

        {/* Diagnostic Metrics Overview Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Storage Footprint */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">حجم التخزين المحلي</span>
              <HardDrive className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900">{formatBytes(totalStorageBytes)}</span>
              <span className="text-[10px] text-slate-500 font-medium">من 5.0 MB المسموحة</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(3, (totalStorageBytes / (5 * 1024 * 1024)) * 100))}%` }}
              />
            </div>
          </div>

          {/* 2. Documents Consistency Check */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">وثائق المعاينة والتحميل</span>
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-emerald-700">
                {storageData.find(m => m.key === STORAGE_KEYS.DOCUMENTS)?.itemCount || 0}
              </span>
              <span className="text-xs text-slate-500">
                (الخادم: {serverState.documentsCount ?? '...'})
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {(storageData.find(m => m.key === STORAGE_KEYS.DOCUMENTS)?.itemCount || 0) === serverState.documentsCount
                ? '✅ متطابقة 100% بين المتصفح والخادم'
                : '⚠️ تفاوت بسيط جاري مزامنته تلقائياً'}
            </span>
          </div>

          {/* 3. Server Status */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">حالة الخادم المركزي</span>
              <Server className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${serverState.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-bold text-slate-800">
                {serverState.online ? 'متصل وجاهز (Online)' : 'غير متصل (Offline)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block font-mono" dir="ltr">
              /api/sync - Express API
            </span>
          </div>

          {/* 4. Quick Actions */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-center gap-1.5">
            <button
              onClick={handleExportBackup}
              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>تصدير نسخة JSON احتياطية</span>
            </button>
            <button
              onClick={handleClearAndResync}
              className="w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-amber-700" />
              <span>إعادة سحب نسخة نقية</span>
            </button>
          </div>
        </div>

        {/* Main Body: Tabs & Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-72 bg-slate-50/70 border-b md:border-b-0 md:border-l border-slate-200 p-3 overflow-y-auto space-y-1.5 shrink-0">
            <div className="text-[11px] font-bold text-slate-400 px-2 py-1">مفاتيح قاعدة البيانات المحلية:</div>

            {storageData.map(meta => (
              <button
                key={meta.key}
                onClick={() => {
                  setActiveTab(meta.key);
                  setSearchQuery('');
                }}
                className={`w-full text-right p-3 rounded-2xl transition-all border flex items-center justify-between gap-2 ${
                  activeTab === meta.key
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <div className="truncate">
                  <div className="font-bold text-xs truncate">{meta.label}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${activeTab === meta.key ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {meta.key}
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      activeTab === meta.key
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {meta.itemCount} عنصر
                  </span>
                  <div className={`text-[9px] mt-0.5 ${activeTab === meta.key ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {meta.sizeFormatted}
                  </div>
                </div>
              </button>
            ))}

            <div className="pt-2 border-t border-slate-200 text-[11px] font-bold text-slate-400 px-2 py-1">
              الخادم المركزي:
            </div>

            <button
              onClick={() => {
                setActiveTab('__SERVER__');
                setSearchQuery('');
              }}
              className={`w-full text-right p-3 rounded-2xl transition-all border flex items-center justify-between gap-2 ${
                activeTab === '__SERVER__'
                  ? 'bg-indigo-700 text-white border-indigo-800 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              <div>
                <div className="font-bold text-xs">بيانات الخادم المركزي (Live Server)</div>
                <div className={`text-[10px] font-mono mt-0.5 ${activeTab === '__SERVER__' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  /api/sync snapshot
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  activeTab === '__SERVER__' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Live
              </span>
            </button>
          </div>

          {/* Right Editor / Inspector Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Top Toolbar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث داخل بيانات هذا المفتاح..."
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-slate-700 px-1"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(formattedContent, activeTab)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {copiedKey === activeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Document Specific Preview List if viewing documents */}
            {activeTab === STORAGE_KEYS.DOCUMENTS && currentMeta?.parsedData && Array.isArray(currentMeta.parsedData) && currentMeta.parsedData.length > 0 && !searchQuery && (
              <div className="bg-slate-50 border-b border-slate-200 p-3 shrink-0 max-h-48 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-600 mb-2">فهرس سريع للوثائق المخزنة ({currentMeta.parsedData.length}):</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentMeta.parsedData.map((doc: any, idx: number) => (
                    <div
                      key={doc.id || idx}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate">{doc.title}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>المؤلف: {doc.authorName}</span>
                          <span>•</span>
                          <span>الأقسام: {(doc.targetClasses || ['ALL']).join(', ')}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {doc.fileFormat || 'pdf'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Code Display */}
            <div className="flex-1 p-4 overflow-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed" dir="ltr">
              <pre className="whitespace-pre-wrap break-all">
                {formattedContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>بيانات رسمية معتمدة لمتوسطة الشهيد بن نعمة مصطفى - تدعم المزامنة اللحظية الشاملة.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
          >
            إغلاق نافذة الفحص
          </button>
        </div>
      </div>
    </div>
  );
};
