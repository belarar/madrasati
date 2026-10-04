import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Laptop,
  Plus,
  QrCode,
  Share2,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { SCHOOL_NAME } from '../../data/mockData';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  installPromptEvent: any;
  onInstallSuccess?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  installPromptEvent,
  onInstallSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [deviceTab, setDeviceTab] = useState<'android' | 'ios' | 'desktop'>('android');

  if (!isOpen) return null;

  const cleanUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        if (onInstallSuccess) onInstallSuccess();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">تثبيت المنصة كتطبيق على الهاتف</h3>
              <p className="text-xs text-emerald-200">
                تشغيل سريع بدون متصفح، إشعارات فورية، وعمل في وضع عدم الاتصال
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Direct Install Button if supported */}
          {installPromptEvent && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3 shadow-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                <span>جهازك يدعم التثبيت المباشر بنقرة واحدة!</span>
              </span>
              <p className="text-xs text-slate-700">
                انقر على الزر أدناه لتثبيت أيقونة التطبيق على شاشة هاتفك فوراً:
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>تثبيت تطبيق متوسطة بن نعمة الآن</span>
              </button>
            </div>
          )}

          {/* Device Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              طريقة التثبيت حسب نوع هاتفك أو جهازك:
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setDeviceTab('android')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  deviceTab === 'android'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>هواتف أندرويد</span>
              </button>
              <button
                onClick={() => setDeviceTab('ios')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  deviceTab === 'ios'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>آيفون (iPhone)</span>
              </button>
              <button
                onClick={() => setDeviceTab('desktop')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  deviceTab === 'desktop'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>الحاسوب (PC)</span>
              </button>
            </div>
          </div>

          {/* Instructions based on Tab */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3 leading-relaxed">
            {deviceTab === 'android' && (
              <>
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-emerald-800">
                  <span>📱 خطوات التثبيت على هواتف أندرويد (Google Chrome):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 font-medium">
                  <li>افتح الرابط في متصفح <strong>Google Chrome</strong> على هاتفك.</li>
                  <li>
                    اضغط على أيقونة <strong>النقاط الثلاث (⋮)</strong> في أعلى الزاوية اليسرى للمتصفح.
                  </li>
                  <li>
                    اختر <strong>«التثبيت على الهاتف»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية (Install app)»</strong>.
                  </li>
                  <li>
                    ستظهر أيقونة التطبيق الخضراء الرسمية <strong>«بن نعمة»</strong> على شاشة هاتفك مثل أي تطبيق من Google Play!
                  </li>
                </ol>
              </>
            )}

            {deviceTab === 'ios' && (
              <>
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-emerald-800">
                  <span>🍏 خطوات التثبيت على أجهزة iPhone / iPad (Safari):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 font-medium">
                  <li>افتح الرابط في متصفح <strong>Safari</strong> الأصلي على هاتف الآيفون.</li>
                  <li>
                    اضغط على زر <strong>المشاركة (Share ⬆️)</strong> الموجود في الشريط السفلي.
                  </li>
                  <li>
                    مرر للأسفل واضغط على <strong>«إضافة إلى الشاشة الرئيسية (Add to Home Screen ➕)»</strong>.
                  </li>
                  <li>
                    اضغط على <strong>«إضافة (Add)»</strong> في الأعلى؛ سيظهر التطبيق مباشرة في شاشة هاتفك الرئيسية.
                  </li>
                </ol>
              </>
            )}

            {deviceTab === 'desktop' && (
              <>
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-emerald-800">
                  <span>💻 التثبيت على الحاسوب الشخصي (Chrome أو Edge):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 font-medium">
                  <li>افتح الرابط في متصفح Chrome أو Edge.</li>
                  <li>
                    ستجد أيقونة تثبيت صغيرة في شريط العنوان (URL bar) على شكل شاشة مع سهم لأسفل.
                  </li>
                  <li>اضغط عليها ثم اختر «تثبيت (Install)».</li>
                  <li>سيعمل التطبيق في نافذة مستقلة وسريعة على سطح المكتب.</li>
                </ol>
              </>
            )}
          </div>

          {/* Clean URL Sharing Section */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-700" />
                <span>إرسال ومشاركة الرابط للآخرين بأمان:</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                حسابك محمي
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              عند إرسال هذا الرابط لزميل أو تلميذ، سيدخل بحسابه الخاص ولن يتمكن من الدخول لحسابك إطلاقاً لأن كل جهاز له جلسته الخاصة المستقلة.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={cleanUrl}
                className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate"
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
