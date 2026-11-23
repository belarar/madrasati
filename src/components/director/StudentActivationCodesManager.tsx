import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Globe,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  List,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { SCHOOL_CLASSES, SCHOOL_NAME } from '../../data/mockData';
import {
  getStudentActivationDirectory,
  normalizeArabic,
  normalizeIdentifier,
  StudentActivationDirectoryEntry,
} from '../../services/storageService';

interface StudentActivationCodesManagerProps {
  onOpenAddStudent?: () => void;
  refreshSignal?: number;
}

export const StudentActivationCodesManager: React.FC<StudentActivationCodesManagerProps> = ({
  onOpenAddStudent,
  refreshSignal = 0,
}) => {
  const [students, setStudents] = useState<StudentActivationDirectoryEntry[]>(() =>
    getStudentActivationDirectory()
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'slips'>('table');
  const [showSchoolIds, setShowSchoolIds] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkCopied, setBulkCopied] = useState(false);
  const [slipsDownloaded, setSlipsDownloaded] = useState<'html' | 'doc' | null>(null);

  const defaultSiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const [siteUrl, setSiteUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ben_naama_platform_url');
      return saved && saved.trim() ? saved.trim() : defaultSiteUrl;
    } catch {
      return defaultSiteUrl;
    }
  });

  const handleSiteUrlChange = (val: string) => {
    setSiteUrl(val);
    try {
      localStorage.setItem('ben_naama_platform_url', val.trim());
    } catch {}
  };

  useEffect(() => {
    const reload = () => setStudents(getStudentActivationDirectory());
    reload();
    window.addEventListener('auth-change', reload);
    return () => window.removeEventListener('auth-change', reload);
  }, [refreshSignal]);

  const classCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      map.set(s.classId, (map.get(s.classId) || 0) + 1);
    }
    return map;
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normQuery = normalizeArabic(searchQuery);
    const numQuery = normalizeIdentifier(searchQuery);

    return students.filter(s => {
      if (selectedClassId !== 'ALL' && s.classId !== selectedClassId) return false;
      if (!searchQuery.trim()) return true;

      const normName = normalizeArabic(s.name);
      return (
        normName.includes(normQuery) ||
        s.activationCode.includes(numQuery) ||
        s.identifier.includes(numQuery) ||
        normalizeArabic(s.className).includes(normQuery)
      );
    });
  }, [students, selectedClassId, searchQuery]);

  const selectedClassName =
    selectedClassId === 'ALL'
      ? 'كافة أفواج المؤسسة'
      : SCHOOL_CLASSES.find(c => c.id === selectedClassId)?.name || selectedClassId;

  const handleCopyCode = async (entry: StudentActivationDirectoryEntry) => {
    try {
      await navigator.clipboard.writeText(entry.activationCode);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = entry.activationCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(entry.identifier);
    setTimeout(() => setCopiedId(prev => (prev === entry.identifier ? null : prev)), 1800);
  };

  const handleCopyListText = async () => {
    const cleanSiteUrl = siteUrl.trim() || defaultSiteUrl;
    const lines = [
      `${SCHOOL_NAME} - قائمة رموز تفعيل التلاميذ (${selectedClassName})`,
      cleanSiteUrl ? `رابط الدخول إلى المنصة: ${cleanSiteUrl}` : '',
      '======================================================',
      ...filteredStudents.map(
        (s, idx) => `${idx + 1}. ${s.name} | ${s.className} | رمز التفعيل: ${s.activationCode}`
      ),
    ].filter(Boolean);
    const payload = lines.join('\n');
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = payload;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2200);
  };

  const handleExportCsv = () => {
    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'الترتيب',
      'القسم الدراسي',
      'اللقب والاسم',
      'رمز التفعيل (6 أرقام)',
      'رقم التعريف المدرسي (16 رقماً)',
      'الجنس',
      'تاريخ الميلاد',
    ];

    const rows = filteredStudents.map((s, idx) =>
      [
        escapeCsv(idx + 1),
        escapeCsv(s.className),
        escapeCsv(s.name),
        escapeCsv(s.activationCode),
        escapeCsv(s.identifier),
        escapeCsv(s.gender || '-'),
        escapeCsv(s.birthDate || '-'),
      ].join(',')
    );

    // UTF-8 BOM ensures Arabic characters open properly in Microsoft Excel
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileSlug = selectedClassId === 'ALL' ? 'all_students' : selectedClassId;
    link.href = url;
    link.download = `رموز_تفعيل_التلاميذ_${fileSlug}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const escapeHtml = (value: string | number | undefined): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const triggerBlobDownload = (content: string, mimeType: string, fileName: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllSlipsHtml = () => {
    if (filteredStudents.length === 0) return;
    const cleanSiteUrl = (siteUrl.trim() || defaultSiteUrl || '').trim();
    const fileSlug = selectedClassId === 'ALL' ? 'جميع_الأقسام' : selectedClassId;

    const slipsMarkup = filteredStudents
      .map(
        (s, idx) => `
      <div class="slip">
        <div class="slip-header">
          <div class="school-name">${escapeHtml(SCHOOL_NAME)}</div>
          <div class="student-name">${escapeHtml(s.name)}</div>
          <div class="student-meta">القسم: <strong>${escapeHtml(s.className)}</strong> • رقم ${idx + 1}</div>
        </div>
        <div class="code-box">
          <div class="code-label">رمز التفعيل الشخصي للدخول إلى المنصة:</div>
          <div class="code-value" dir="ltr">${escapeHtml(s.activationCode)}</div>
        </div>
        ${
          cleanSiteUrl
            ? `<div class="url-box">
                <div class="url-label">رابط الدخول إلى المنصة:</div>
                <div class="url-value" dir="ltr">${escapeHtml(cleanSiteUrl)}</div>
                <div class="hint">افتح الرابط ← اختر «فضاء التلاميذ» ← أدخل رمز التفعيل أعلاه</div>
              </div>`
            : ''
        }
        <div class="slip-footer">
          <span>سري وشخصي للتلميذ(ة)</span>
          ${showSchoolIds ? `<span dir="ltr" class="mono">${escapeHtml(s.identifier)}</span>` : ''}
        </div>
      </div>`
      )
      .join('\n');

    const htmlDoc = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>قصاصات رموز تفعيل التلاميذ - ${escapeHtml(selectedClassName)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      direction: rtl;
    }
    .toolbar {
      max-width: 900px;
      margin: 0 auto 14px;
      background: #064e3b;
      color: #fff;
      padding: 12px 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .toolbar button {
      background: #fef08a;
      color: #064e3b;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
    }
    .doc-header {
      max-width: 900px;
      margin: 0 auto 14px;
      text-align: center;
      border-bottom: 2px solid #334155;
      padding-bottom: 10px;
    }
    .doc-header h1 { margin: 4px 0; font-size: 18px; }
    .doc-header p { margin: 2px 0; font-size: 12px; color: #334155; }
    .grid {
      max-width: 900px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .slip {
      background: #ffffff;
      border: 1.5px dashed #64748b;
      border-radius: 12px;
      padding: 11px 12px;
      break-inside: avoid;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .slip-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .school-name { font-size: 10px; font-weight: 800; color: #065f46; }
    .student-name { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    .student-meta { font-size: 11px; color: #475569; margin-top: 1px; }
    .code-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 6px;
      text-align: center;
    }
    .code-label { font-size: 10px; font-weight: 700; color: #064e3b; }
    .code-value {
      font-family: 'Courier New', monospace;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 6px;
      color: #022c22;
      margin-top: 2px;
    }
    .url-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 8px;
    }
    .url-label { font-size: 10px; font-weight: 700; color: #334155; }
    .url-value {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #064e3b;
      word-break: break-all;
      margin-top: 2px;
    }
    .hint { font-size: 9px; color: #64748b; margin-top: 2px; }
    .slip-footer {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #64748b;
    }
    .mono { font-family: 'Courier New', monospace; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .grid { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>${escapeHtml(SCHOOL_NAME)}</strong> — قصاصات التوزيع (${escapeHtml(selectedClassName)} • ${filteredStudents.length} قصاصة)
    </div>
    <button onclick="window.print()">طباعة القصاصات أو حفظها PDF</button>
  </div>
  <div class="doc-header">
    <p>الجمهورية الجزائرية الديمقراطية الشعبية • وزارة التربية الوطنية</p>
    <h1>${escapeHtml(SCHOOL_NAME)} — قصاصات رموز تفعيل التلاميذ</h1>
    <p>القسم: ${escapeHtml(selectedClassName)} • العدد الإجمالي: ${filteredStudents.length} تلميذ(ة)</p>
  </div>
  <div class="grid">
    ${slipsMarkup}
  </div>
</body>
</html>`;

    triggerBlobDownload(
      '\uFEFF' + htmlDoc,
      'text/html;charset=utf-8;',
      `قصاصات_التلاميذ_${fileSlug}.html`
    );
    setSlipsDownloaded('html');
    setTimeout(() => setSlipsDownloaded(prev => (prev === 'html' ? null : prev)), 2500);
  };

  const handleDownloadAllSlipsWord = () => {
    if (filteredStudents.length === 0) return;
    const cleanSiteUrl = (siteUrl.trim() || defaultSiteUrl || '').trim();
    const fileSlug = selectedClassId === 'ALL' ? 'جميع_الأقسام' : selectedClassId;

    const rows: string[] = [];
    for (let i = 0; i < filteredStudents.length; i += 2) {
      const pair = [filteredStudents[i], filteredStudents[i + 1]];
      const cells = pair
        .map((s, offset) => {
          if (!s) return '<td style="width:50%; padding:6px;"></td>';
          const num = i + offset + 1;
          return `<td style="width:50%; vertical-align:top; padding:6px;">
            <div style="border:1.5pt dashed #64748b; padding:10px; background:#ffffff; page-break-inside:avoid;">
              <div style="font-size:9pt; font-weight:bold; color:#065f46;">${escapeHtml(SCHOOL_NAME)}</div>
              <div style="font-size:12pt; font-weight:bold; color:#0f172a; margin-top:3px;">${escapeHtml(s.name)}</div>
              <div style="font-size:9.5pt; color:#475569; border-bottom:1px solid #e2e8f0; padding-bottom:5px; margin-bottom:6px;">
                القسم: <strong>${escapeHtml(s.className)}</strong> • رقم ${num}
              </div>
              <div style="background:#ecfdf5; border:1px solid #6ee7b7; padding:6px; text-align:center; margin-bottom:6px;">
                <div style="font-size:8.5pt; font-weight:bold; color:#064e3b;">رمز التفعيل الشخصي للدخول إلى المنصة:</div>
                <div dir="ltr" style="font-family:'Courier New',monospace; font-size:18pt; font-weight:bold; letter-spacing:4px; color:#022c22; margin-top:2px;">
                  ${escapeHtml(s.activationCode)}
                </div>
              </div>
              ${
                cleanSiteUrl
                  ? `<div style="background:#f8fafc; border:1px solid #cbd5e1; padding:5px 6px; margin-bottom:5px;">
                      <div style="font-size:8.5pt; font-weight:bold; color:#334155;">رابط الدخول إلى المنصة:</div>
                      <div dir="ltr" style="font-family:'Courier New',monospace; font-size:8pt; font-weight:bold; color:#064e3b; word-break:break-all;">
                        ${escapeHtml(cleanSiteUrl)}
                      </div>
                      <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">
                        افتح الرابط ← اختر «فضاء التلاميذ» ← أدخل رمز التفعيل أعلاه
                      </div>
                    </div>`
                  : ''
              }
              <div style="font-size:8pt; color:#64748b;">
                سري وشخصي للتلميذ(ة)${showSchoolIds ? ` | <span dir="ltr">${escapeHtml(s.identifier)}</span>` : ''}
              </div>
            </div>
          </td>`;
        })
        .join('');
      rows.push(`<tr style="page-break-inside:avoid;">${cells}</tr>`);
    }

    const wordDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>قصاصات رموز التفعيل - ${escapeHtml(selectedClassName)}</title>
  <style>
    body { font-family: Arial, Tahoma, sans-serif; direction: rtl; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="text-align:center; border-bottom:2px solid #1e293b; padding-bottom:8px; margin-bottom:10px;">
    <div style="font-size:10pt; font-weight:bold;">الجمهورية الجزائرية الديمقراطية الشعبية • وزارة التربية الوطنية</div>
    <div style="font-size:14pt; font-weight:bold; margin:4px 0;">${escapeHtml(SCHOOL_NAME)} — قصاصات رموز تفعيل التلاميذ</div>
    <div style="font-size:10pt;">القسم: ${escapeHtml(selectedClassName)} • العدد: ${filteredStudents.length} تلميذ(ة)</div>
  </div>
  <table dir="rtl">
    <tbody>
      ${rows.join('\n')}
    </tbody>
  </table>
</body>
</html>`;

    triggerBlobDownload(
      '\uFEFF' + wordDoc,
      'application/msword;charset=utf-8;',
      `قصاصات_التلاميذ_${fileSlug}.doc`
    );
    setSlipsDownloaded('doc');
    setTimeout(() => setSlipsDownloaded(prev => (prev === 'doc' ? null : prev)), 2500);
  };

  return (
    <div className="space-y-5 text-right">
      {/* Print-only Institutional Header */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4 text-center space-y-1">
        <p className="text-xs font-bold text-slate-700">الجمهورية الجزائرية الديمقراطية الشعبية • وزارة التربية الوطنية</p>
        <h2 className="text-lg font-black text-slate-900">
          {SCHOOL_NAME} — قائمة رموز تفعيل دخول التلاميذ (6 أرقام)
        </h2>
        <p className="text-xs font-bold text-slate-700">
          القسم: {selectedClassName} • العدد الإجمالي: {filteredStudents.length} تلميذ(ة)
        </p>
        {(siteUrl.trim() || defaultSiteUrl) && (
          <p className="text-xs font-bold text-emerald-900">
            رابط المنصة: <span className="font-mono" dir="ltr">{siteUrl.trim() || defaultSiteUrl}</span>
          </p>
        )}
      </div>

      {/* Interactive Management Header Card */}
      <div className="print:hidden bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>قائمة رموز تفعيل التلاميذ (6 أرقام)</span>
                  <span className="text-xs font-black bg-emerald-700 text-white px-2.5 py-0.5 rounded-full">
                    {students.length} تلميذ وتلميذة
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  كل تلميذ لديه رمز سري فريد مكون من 6 أرقام غير مكرر للدخول مباشرة إلى فضائه. يمكنك البحث، النسخ، الطباعة أو تصدير الجدول لملف Excel.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenAddStudent && (
              <button
                type="button"
                onClick={onOpenAddStudent}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-yellow-300" />
                <span>إضافة تلميذ جديد</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyListText}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {bulkCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span className="text-emerald-800">تم نسخ القائمة ({filteredStudents.length}) ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>نسخ القائمة كنص</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير Excel (CSV)</span>
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDownloadAllSlipsHtml}
              disabled={filteredStudents.length === 0}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              title="تحميل جميع القصاصات في ملف واحد جاهز للطباعة أو الحفظ بصيغة PDF"
            >
              {slipsDownloaded === 'html' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم تحميل {filteredStudents.length} قصاصة ✓</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل القصاصات دفعة واحدة ({filteredStudents.length})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadAllSlipsWord}
              disabled={filteredStudents.length === 0}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-900 border border-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="تحميل جميع القصاصات دفعة واحدة في ملف Word قابل للفتح والتعديل والطباعة"
            >
              {slipsDownloaded === 'doc' ? (
                <>
                  <Check className="w-4 h-4 text-blue-700" />
                  <span>تم تحميل ملف Word ✓</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span>تحميل القصاصات (Word)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة {viewMode === 'slips' ? 'قصاصات التوزيع' : 'القائمة'}</span>
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>تنبيه تنظيمي:</strong> هذه القائمة مخصصة للسيد المدير والسيدة الناظرة فقط لتوزيع رموز التفعيل على التلاميذ. يُستحسن اختيار القسم الدراسي ثم الضغط على <strong>"قصاصات التوزيع الفردية"</strong> لطباعة قصاصة فردية لكل تلميذ تحوي رابط المنصة ورمزه السري.
          </span>
        </div>

        {/* Platform URL field included in every printed student slip */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-950 shrink-0">
            <Globe className="w-4 h-4 text-emerald-700" />
            <span>رابط الموقع المطبوع في قصاصة التلاميذ:</span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="url"
              value={siteUrl}
              onChange={e => handleSiteUrlChange(e.target.value)}
              placeholder="https://..."
              dir="ltr"
              className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-mono font-bold text-emerald-950 outline-none focus:border-emerald-700"
            />
            {siteUrl !== defaultSiteUrl && defaultSiteUrl && (
              <button
                type="button"
                onClick={() => handleSiteUrlChange(defaultSiteUrl)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                title="استعادة الرابط الحالي للمنصة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>الرابط الحالي</span>
              </button>
            )}
          </div>
        </div>

        {/* Search, View Switch & Class Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم التلميذ، رمز التفعيل (6 أرقام)، أو الرقم المدرسي..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium outline-none bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSchoolIds(v => !v)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {showSchoolIds ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSchoolIds ? 'إخفاء الرقم المدرسي (16 رقماً)' : 'إظهار الرقم المدرسي (16 رقماً)'}</span>
            </button>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>جدول القائمة</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('slips')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'slips'
                    ? 'bg-white text-emerald-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>قصاصات التوزيع الفردية</span>
              </button>
            </div>
          </div>
        </div>

        {/* All 11 Classes Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedClassId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedClassId === 'ALL'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>جميع الأقسام ({students.length})</span>
          </button>

          {SCHOOL_CLASSES.map(cls => {
            const count = classCounts.get(cls.id) || 0;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all ${
                  selectedClassId === cls.id
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cls.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results View */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          لا توجد نتائج مطابقة للبحث الحالي. جرّب مسح نص البحث أو اختيار "جميع الأقسام".
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs print:rounded-none print:border-slate-400">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 text-xs font-black">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">اللقب والاسم</th>
                  <th className="py-3 px-3">القسم الدراسي</th>
                  <th className="py-3 px-3 hidden sm:table-cell">تاريخ الميلاد</th>
                  <th className="py-3 px-3 text-center">رمز التفعيل (6 أرقام)</th>
                  {showSchoolIds && (
                    <th className="py-3 px-3 hidden md:table-cell text-left" dir="ltr">
                      رقم التعريف المدرسي
                    </th>
                  )}
                  <th className="py-3 px-3 text-center print:hidden w-24">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const isCopied = copiedId === s.identifier;
                  return (
                    <tr
                      key={s.identifier}
                      className="hover:bg-emerald-50/40 transition-colors print:break-inside-avoid"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {s.isCustom && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold print:hidden">
                              مضاف حديثاً
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell font-mono text-xs text-slate-600">
                        {s.birthDate || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          dir="ltr"
                          className="inline-block font-mono font-black text-sm sm:text-base tracking-[0.2em] px-3 py-1 rounded-xl bg-emerald-100/90 text-emerald-950 border border-emerald-300 select-all"
                        >
                          {s.activationCode}
                        </span>
                      </td>
                      {showSchoolIds && (
                        <td className="py-2.5 px-3 hidden md:table-cell font-mono text-xs text-slate-600 text-left" dir="ltr">
                          {s.identifier}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(s)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>نُسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Printable Cut-out Activation Slips View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2 print:gap-2.5">
          {filteredStudents.map((s, idx) => {
            const isCopied = copiedId === s.identifier;
            return (
              <div
                key={s.identifier}
                className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-4 flex flex-col justify-between gap-3 print:break-inside-avoid print:border-slate-500 print:p-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{SCHOOL_NAME}</span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-1">{s.name}</h4>
                    <p className="text-xs font-bold text-slate-600">
                      القسم: {s.className} • رقم {idx + 1}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(s)}
                    className="print:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 cursor-pointer"
                    title="نسخ رمز التفعيل"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-900 block">
                    رمز التفعيل الشخصي للدخول إلى المنصة:
                  </span>
                  <div
                    dir="ltr"
                    className="font-mono font-black text-2xl tracking-[0.28em] text-emerald-950 select-all"
                  >
                    {s.activationCode}
                  </div>
                </div>

                {(siteUrl.trim() || defaultSiteUrl) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                      <Globe className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span>رابط الدخول إلى المنصة:</span>
                    </div>
                    <div
                      dir="ltr"
                      className="font-mono text-[10px] font-bold text-emerald-900 break-all select-all"
                    >
                      {siteUrl.trim() || defaultSiteUrl}
                    </div>
                    <p className="text-[9px] text-slate-500 pt-0.5">
                      افتح الرابط ← اختر «فضاء التلاميذ» ← أدخل رمز التفعيل أعلاه
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>سري وشخصي للتلميذ(ة)</span>
                  {showSchoolIds && (
                    <span className="font-mono" dir="ltr">
                      {s.identifier}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
