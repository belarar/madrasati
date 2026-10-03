import {
  EducationLevel,
  ParentSummon,
  PeerExchangePost,
  SchoolAnnouncement,
  SchoolClass,
  SchoolDocument,
  Subject,
  UserProfile,
} from '../types';
import { OFFICIAL_STUDENTS_LIST, toUserProfile } from './officialStudents';
import { OFFICIAL_STAFF_LIST, toStaffUserProfile } from './officialStaff';

export const SCHOOL_NAME = 'متوسطة الشهيد بن نعمة مصطفى (غليزان)';
export const SCHOOL_FULL_HEADER = 'الجمهورية الجزائرية الديمقراطية الشعبية\nوزارة التربية الوطنية\nمديرية التربية لولاية غليزان\nمتوسطة الشهيد بن نعمة مصطفى (غليزان)';

export const SUBJECTS: Subject[] = [
  { id: 'math', name: 'الرياضيات', iconName: 'Calculator', color: 'from-blue-600 to-indigo-600' },
  { id: 'arabic', name: 'اللغة العربية وآدابها', iconName: 'BookOpen', color: 'from-emerald-600 to-teal-700' },
  { id: 'physics', name: 'العلوم الفيزيائية والتكنولوجيا', iconName: 'Zap', color: 'from-amber-500 to-orange-600' },
  { id: 'science', name: 'علوم الطبيعة والحياة', iconName: 'Leaf', color: 'from-green-600 to-emerald-700' },
  { id: 'french', name: 'اللغة الفرنسية', iconName: 'Globe', color: 'from-sky-600 to-cyan-700' },
  { id: 'english', name: 'اللغة الإنجليزية', iconName: 'Languages', color: 'from-purple-600 to-indigo-700' },
  { id: 'history_geo', name: 'التاريخ والجغرافيا', iconName: 'Compass', color: 'from-yellow-600 to-amber-700' },
  { id: 'islamic', name: 'التربية الإسلامية', iconName: 'Moon', color: 'from-teal-600 to-emerald-800' },
  { id: 'civics', name: 'التربية المدنية', iconName: 'ShieldCheck', color: 'from-rose-600 to-red-700' },
  { id: 'sport', name: 'التربية البدنية والرياضية', iconName: 'Activity', color: 'from-lime-600 to-emerald-600' },
  { id: 'art', name: 'التربية التشكيلية والموسيقية (الرسم)', iconName: 'Palette', color: 'from-pink-600 to-rose-600' },
  { id: 'informatics', name: 'الإعلام الآلي', iconName: 'Monitor', color: 'from-cyan-600 to-blue-700' },
  { id: 'admin', name: 'وثائق ومراسلات إدارية رسمية', iconName: 'FileText', color: 'from-slate-700 to-slate-900' },
];

export const SCHOOL_CLASSES: SchoolClass[] = [
  { id: '4AM-1', name: 'رابعة متوسط 01 (مقبلون على شهادة BEM)', level: '4AM', studentCount: 32 },
  { id: '4AM-2', name: 'رابعة متوسط 02 (مقبلون على شهادة BEM)', level: '4AM', studentCount: 32 },
  { id: '4AM-3', name: 'رابعة متوسط 03 (مقبلون على شهادة BEM)', level: '4AM', studentCount: 31 },
  { id: '3AM-1', name: 'ثالثة متوسط 01', level: '3AM', studentCount: 43 },
  { id: '3AM-2', name: 'ثالثة متوسط 02', level: '3AM', studentCount: 40 },
  { id: '2AM-1', name: 'ثانية متوسط 01', level: '2AM', studentCount: 39 },
  { id: '2AM-2', name: 'ثانية متوسط 02', level: '2AM', studentCount: 38 },
  { id: '2AM-3', name: 'ثانية متوسط 03', level: '2AM', studentCount: 40 },
  { id: '1AM-1', name: 'أولى متوسط 01', level: '1AM', studentCount: 33 },
  { id: '1AM-2', name: 'أولى متوسط 02', level: '1AM', studentCount: 34 },
  { id: '1AM-3', name: 'أولى متوسط 03', level: '1AM', studentCount: 31 },
];

// Clean authentic baseline users (قاعدة بيانات المستخدمين المعتمدين الحصرية لمتوسطة الشهيد بن نعمة مصطفى)
export const MOCK_USERS: UserProfile[] = [
  // 1. All Official 42 Staff Members (السادة المدير والناظر والأساتذة والمشرفون والطاقم الإداري والعمال)
  ...OFFICIAL_STAFF_LIST.map(toStaffUserProfile),

  // 2. All Official 393 Students from Ministry lists (التلاميذ المسجلون رسمياً في المؤسسة فقط)
  ...OFFICIAL_STUDENTS_LIST.map(toUserProfile),
];

export const TOTAL_OFFICIAL_STAFF_COUNT = OFFICIAL_STAFF_LIST.length; // 42
export const TOTAL_OFFICIAL_STUDENTS_COUNT = OFFICIAL_STUDENTS_LIST.length; // 393
export const TOTAL_AUTHORIZED_USERS_COUNT = MOCK_USERS.length; // 435

// Map for instant O(1) identifier verification
export const AUTHORIZED_IDENTIFIERS_MAP = new Map<string, UserProfile>(
  MOCK_USERS.map(u => [u.identifier.toLowerCase(), u])
);

export function isAuthorizedIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  return AUTHORIZED_IDENTIFIERS_MAP.has(identifier.trim().toLowerCase());
}

export function getAuthorizedUserByIdentifier(identifier: string): UserProfile | undefined {
  if (!identifier) return undefined;
  return AUTHORIZED_IDENTIFIERS_MAP.get(identifier.trim().toLowerCase());
}

// Clean baseline documents: initially empty so teachers and administration upload their real files
export const INITIAL_DOCUMENTS: SchoolDocument[] = [];

// Official school welcome announcement
export const INITIAL_ANNOUNCEMENTS: SchoolAnnouncement[] = [
  {
    id: 'ann-official-1',
    title: 'افتتاح المنصة الرقمية الرسمية لمتوسطة الشهيد بن نعمة مصطفى',
    content: 'ترحب إدارة متوسطة الشهيد بن نعمة مصطفى بكافة الأساتذة الكرام وبناتنا وأبنائنا التلاميذ في المنصة الرقمية المخصصة لتبادل الوثائق التعليمية (Word و PDF) والفروض والدروس والتوجيهات المدرسية.\nنتمنى للجميع موسماً دراسياً مكللاً بالنجاح والتفوق.',
    target: 'all',
    priority: 'important',
    authorName: 'إدارة متوسطة الشهيد بن نعمة مصطفى',
    authorRole: 'director',
    createdAt: new Date().toISOString(),
    badge: 'إعلان افتتاحي رسمي',
    views: 1,
  },
];

export const INITIAL_SUMMONS: ParentSummon[] = [];

// مبادرات أولية لقناة التضامن وتبادل الدروس بين تلاميذ القسم الواحد
export const INITIAL_PEER_EXCHANGES: PeerExchangePost[] = [
  {
    id: 'peer-init-1',
    classId: '2AM-2',
    className: 'ثانية متوسط 02',
    studentId: '1101414140032700',
    studentName: 'عدة عمار فاطمة هاجر',
    subjectId: 'science',
    type: 'missed_lesson',
    title: 'ملخص درس العلوم الطبيعية - التنسيق الوظيفي في العضوية',
    content: 'السلام عليكم زميلاتي وزملائي في قسم 2AM-2، هذا تلخيص كامل لعناصر درس العلوم اليوم مع الملاحظات التي أكدت عليها الأستاذة في القسم، وضعته هنا ليستفيد منه الزملاء الذين تغيبوا أو لم يلحقوا بالنقل من السبورة.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    thanksCount: 8,
    thankedBy: [],
    replies: [
      {
        id: 'rep-init-1',
        studentId: '1101501160038700',
        studentName: 'رمضاوي فرح زوليخة',
        content: 'شكراً جزيلاً لكِ يا هاجر، بارك الله فيكِ! كنت متغيبة بسبب موعد طبي وكنت قلقة بشأن نقل الدرس.',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'peer-init-2',
    classId: '2AM-2',
    className: 'ثانية متوسط 02',
    studentId: '1001427010330800',
    studentName: 'دحماني مولود',
    subjectId: 'math',
    type: 'homework_help',
    title: 'توضيح وحل التمرين 14 صفحة 58 في الرياضيات',
    content: 'تحية لجميع الزملاء، لمن وجد صعوبة في فهم المطلوب في تمرين الرياضيات لليوم، إليكم الخطوات المنهجية لحساب المجهول وتطبيق القاعدة التي درسناها.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    thanksCount: 5,
    thankedBy: [],
    replies: [],
  },
  {
    id: 'peer-init-3',
    classId: '4AM-1',
    className: 'رابعة متوسط 01',
    studentId: '1101248010366200',
    studentName: 'بطاهر ياسمين',
    subjectId: 'history_geo',
    type: 'summary_notes',
    title: 'ملخص كرونولوجي لتواريخ التاريخ الهامة - تحضير BEM',
    content: 'ملخص مرتب ومبسط لكافة المحطات والأحداث التاريخية المقررة في الفصل الأول، قمت بجمعها من كراسي لمراجعتها معاً استعداداً لشهادة التعليم المتوسط.',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    thanksCount: 12,
    thankedBy: [],
    replies: [],
  },
];

