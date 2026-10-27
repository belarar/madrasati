import { SubjectId, UserProfile, UserRole } from '../types';

export interface OfficialStaffMember {
  identifier: string; // الرمز الوظيفي (16 رقم)
  surname: string; // اللقب
  firstName: string; // الاسم
  birthDate: string; // تاريخ الازدياد
  rank: string; // الرتبة
  subjectName?: string; // المادة
  subjectId?: SubjectId;
  role: UserRole; // 'director' | 'censor' | 'teacher' | 'staff'
  grade: number; // الدرجة
  effectiveDate: string; // تاريخ السريان
  pin?: string; // كلمة السر الشخصية (من 4 خانات فما فوق)
  email?: string;
  assignedClasses?: string[]; // الأقسام المسندة للأستاذ بناءً على جدول التوقيت العام
}

// القائمة الرسمية الكاملة لمستخدمي متوسطة الشهيد بن نعمة مصطفى (42 موظفاً وأستاذاً)
export const OFFICIAL_STAFF_LIST: OfficialStaffMember[] = [
  // ================= 1. إدارة المؤسسة =================
  {
    identifier: '1097448010036800',
    surname: 'عدة عمار',
    firstName: 'عبد القادر',
    birthDate: '1974-02-03',
    rank: 'مدير متوسطة',
    role: 'director',
    grade: 9,
    effectiveDate: '2025-01-01',
    email: 'biomoleculaire7@gmail.com',
  },
  {
    identifier: '1198044010190200',
    surname: 'شقايبل',
    firstName: 'نعيمة',
    birthDate: '1980-09-12',
    rank: 'ناظرة في التعليم المتوسط',
    role: 'censor',
    grade: 8,
    effectiveDate: '2025-01-01',
    email: 'chakaibel.naima@education.dz',
  },

  // ================= 2. الأساتذة والجدول العام لإسناد الأقسام =================
  {
    identifier: '1197348010089800',
    surname: 'حمزة',
    firstName: 'نفيسة',
    birthDate: '1973-04-10',
    rank: 'أستاذ التعليم المتوسط',
    subjectName: 'اللغة الإنجليزية',
    subjectId: 'english',
    role: 'teacher',
    grade: 12,
    effectiveDate: '2025-01-01',
    email: 'hamza.nafissa@education.dz',
    assignedClasses: ['2AM-2', '4AM-1', '4AM-2', '4AM-3'], // 2م2، 4م1، 4م2، 4م3
  },
  {
    identifier: '1198748010008200',
    surname: 'حرات',
    firstName: 'غنية',
    birthDate: '1987-01-05',
    rank: 'أستاذ التعليم المتوسط',
    subjectName: 'الرياضيات',
    subjectId: 'math',
    role: 'teacher',
    grade: 0,
    effectiveDate: '2025-03-23',
    email: 'harrat.ghania@education.dz',
    assignedClasses: ['2AM-1', '2AM-2', '3AM-1', '3AM-2'], // 2م1، 2م2، 3م1، 3م2
  },
  {
    identifier: '1097331010938000',
    surname: 'أحمد فواتيح',
    firstName: 'هواري',
    birthDate: '1973-09-28',
    rank: 'أستاذ التعليم المتوسط',
    subjectName: 'اللغة الفرنسية',
    subjectId: 'french',
    role: 'teacher',
    grade: 9,
    effectiveDate: '2025-01-01',
    email: 'ahmedfouatih.houari@education.dz',
    assignedClasses: ['1AM-1', '4AM-1', '4AM-2', '4AM-3'], // 1م1، 4م1، 4م2، 4م3
  },
  {
    identifier: '1198248010321500',
    surname: 'بوراس',
    firstName: 'سعاد',
    birthDate: '1982-06-24',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'اللغة الفرنسية',
    subjectId: 'french',
    role: 'teacher',
    grade: 6,
    effectiveDate: '2025-01-01',
    email: 'bouras.souad@education.dz',
    assignedClasses: ['1AM-2', '2AM-1', '2AM-2', '2AM-3'], // 1م2، 2م1، 2م2، 2م3
  },
  {
    identifier: '1199431010368800',
    surname: 'بلخوجة',
    firstName: 'نجية',
    birthDate: '1994-04-17',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'العلوم الطبيعية',
    subjectId: 'science',
    role: 'teacher',
    grade: 3,
    effectiveDate: '2025-09-04',
    email: 'belkhodja.najia@education.dz',
    assignedClasses: ['2AM-1', '2AM-2', '2AM-3', '3AM-2', '4AM-1', '4AM-2', '4AM-3'], // 2م1، 2م2، 2م3، 3م2، 4م1، 4م2، 4م3
  },
  {
    identifier: '1198540010004300',
    surname: 'مليح',
    firstName: 'مريم',
    birthDate: '1985-05-19',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'العلوم الطبيعية',
    subjectId: 'science',
    role: 'teacher',
    grade: 4,
    effectiveDate: '2025-01-01',
    email: 'melih.meryem@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-1', '2AM-3', '3AM-1'], // 1م1، 1م2، 1م3، 2م1، 2م3، 3م1
  },
  {
    identifier: '1198702040226100',
    surname: 'ميراوي',
    firstName: 'ياسمينة',
    birthDate: '1987-07-17',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'الإعلام الآلي',
    subjectId: 'informatics',
    role: 'teacher',
    grade: 4,
    effectiveDate: '2025-01-01',
    email: 'miraoui.yasmina@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-1', '2AM-2', '2AM-3', '3AM-1', '3AM-2', '4AM-1', '4AM-2', '4AM-3'], // كافة أقسام المؤسسة
  },
  {
    identifier: '1198948090064800',
    surname: 'روان',
    firstName: 'فوزية',
    birthDate: '1989-09-26',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'التاريخ والجغرافيا',
    subjectId: 'history_geo',
    role: 'teacher',
    grade: 4,
    effectiveDate: '2025-01-01',
    email: 'raouane.fouzia@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-3', '3AM-1', '3AM-2'], // 1م1، 1م2، 1م3، 2م3، 3م1، 3م2 (بن دربال فوزية)
  },
  {
    identifier: '1199048010302000',
    surname: 'بن طاطة',
    firstName: 'فاطمة الزهرة',
    birthDate: '1990-08-11',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'العلوم الفيزيائية والتكنولوجيا',
    subjectId: 'physics',
    role: 'teacher',
    grade: 4,
    effectiveDate: '2025-09-04',
    email: 'bentata.fatma@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-1', '2AM-3', '3AM-1'], // 1م1، 1م2، 1م3، 2م1، 2م3، 3م1
  },
  {
    identifier: '1098748010140400',
    surname: 'عثمان بن عودة',
    firstName: 'عثمان',
    birthDate: '1987-03-31',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'التربية البدنية والرياضية',
    subjectId: 'sport',
    role: 'teacher',
    grade: 1,
    effectiveDate: '2025-06-11',
    assignedClasses: [
      '1AM-1',
      '1AM-2',
      '1AM-3',
      '2AM-1',
      '2AM-2',
      '2AM-3',
      '3AM-1',
      '3AM-2',
      '4AM-1',
      '4AM-2',
      '4AM-3',
    ], // كافة أقسام المؤسسة (11 قسماً) - التربية البدنية والرياضية
  },
  {
    identifier: '1199348010004800',
    surname: 'صافة',
    firstName: 'خيرة',
    birthDate: '1993-01-04',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'اللغة العربية',
    subjectId: 'arabic',
    role: 'teacher',
    grade: 3,
    effectiveDate: '2025-01-01',
    email: 'safa.khira@education.dz',
    assignedClasses: ['1AM-3', '2AM-3', '3AM-1', '3AM-2'], // 1م3، 2م3، 3م1، 3م2
  },
  {
    identifier: '1098948080039300',
    surname: 'مناد',
    firstName: 'محمد',
    birthDate: '1989-07-12',
    rank: 'أستاذ التعليم المتوسط قسم أول',
    subjectName: 'الرياضيات',
    subjectId: 'math',
    role: 'teacher',
    grade: 5,
    effectiveDate: '2025-11-24',
    email: 'menad.mohammed@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-3'], // 1م1، 1م2، 1م3، 2م3
  },
  {
    identifier: '1197414160078700',
    surname: 'خليل',
    firstName: 'سامية',
    birthDate: '1974-09-04',
    rank: 'أستاذ التعليم المتوسط قسم ثان',
    subjectName: 'العلوم الفيزيائية والتكنولوجيا',
    subjectId: 'physics',
    role: 'teacher',
    grade: 7,
    effectiveDate: '2025-01-01',
    email: 'khelil.samia@education.dz',
    assignedClasses: ['2AM-1', '2AM-2', '2AM-3', '3AM-2', '4AM-1', '4AM-2', '4AM-3'], // 2م1، 2م2، 2م3، 3م2، 4م1، 4م2، 4م3 (ميلود عامر سامية)
  },
  {
    identifier: '1198613010150400',
    surname: 'حمومي',
    firstName: 'شميسة',
    birthDate: '1986-04-11',
    rank: 'أستاذ التعليم المتوسط قسم ثان',
    subjectName: 'اللغة العربية',
    subjectId: 'arabic',
    role: 'teacher',
    grade: 6,
    effectiveDate: '2025-10-01',
    email: 'hamoumi.chemissa@education.dz',
    assignedClasses: ['1AM-2', '2AM-1', '2AM-2', '4AM-2'], // 1م2، 2م1، 2م2، 4م2
  },
  {
    identifier: '1097748010047200',
    surname: 'مكي',
    firstName: 'يحي',
    birthDate: '1977-02-05',
    rank: 'أستاذ التعليم المتوسط قسم ثان',
    subjectName: 'الرسم والتربية التشكيلية',
    subjectId: 'art',
    role: 'teacher',
    grade: 9,
    effectiveDate: '2025-08-16',
    assignedClasses: [
      '1AM-1',
      '1AM-2',
      '1AM-3',
      '2AM-1',
      '2AM-2',
      '2AM-3',
      '3AM-1',
      '3AM-2',
      '4AM-1',
      '4AM-2',
      '4AM-3',
    ], // كافة أقسام المؤسسة (11 قسماً) - التربية التشكيلية
  },
  {
    identifier: '1198646090002600',
    surname: 'بلخروبي',
    firstName: 'نوال',
    birthDate: '1986-04-15',
    rank: 'أستاذ التعليم المتوسط قسم ثان',
    subjectName: 'اللغة الفرنسية',
    subjectId: 'french',
    role: 'teacher',
    grade: 6,
    effectiveDate: '2025-01-01',
    email: 'belkherroubi.nawel@education.dz',
    assignedClasses: ['1AM-3', '2AM-3', '3AM-1', '3AM-2'], // 1م3، 2م3، 3م1، 3م2 (بن بريكة نوال)
  },
  {
    identifier: '1098429340019200',
    surname: 'العربي بن حجار',
    firstName: 'سمير',
    birthDate: '1984-03-25',
    rank: 'أستاذ التعليم المتوسط قسم ثان',
    subjectName: 'الرياضيات',
    subjectId: 'math',
    role: 'teacher',
    grade: 7,
    effectiveDate: '2025-05-01',
    email: 'elarbi.samir@education.dz',
    assignedClasses: ['4AM-1', '4AM-2', '4AM-3'], // كافة أقسام السنة الرابعة متوسط
  },
  {
    identifier: '8197148010100500',
    surname: 'الجوهري',
    firstName: 'جميلة',
    birthDate: '1971-05-06',
    rank: 'أستاذ مميز في التعليم المتوسط',
    subjectName: 'التاريخ والجغرافيا',
    subjectId: 'history_geo',
    role: 'teacher',
    grade: 11,
    effectiveDate: '2025-01-01',
    email: 'djouhari.djamila@education.dz',
    assignedClasses: ['2AM-1', '2AM-2', '2AM-3', '3AM-2', '4AM-1', '4AM-2', '4AM-3'], // 2م1، 2م2، 2م3، 3م2، 4م1، 4م2، 4م3
  },
  {
    identifier: '1096448010043700',
    surname: 'حداه',
    firstName: 'بلعالية',
    birthDate: '1964-02-23',
    rank: 'أستاذ مميز في التعليم المتوسط',
    subjectName: 'اللغة العربية',
    subjectId: 'arabic',
    role: 'teacher',
    grade: 12,
    effectiveDate: '2025-01-01',
    email: 'haddah.belalia@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '2AM-1'], // 1م1، 1م2، 2م1 (جداه بلعاليا)
  },
  {
    identifier: '1198048010203300',
    surname: 'عومر',
    firstName: 'وهيبة',
    birthDate: '1980-06-14',
    rank: 'أستاذ في التعليم المتوسط',
    subjectName: 'اللغة العربية',
    subjectId: 'arabic',
    role: 'teacher',
    grade: 8,
    effectiveDate: '2025-01-01',
    email: 'aoumer.ouahiba@education.dz',
    assignedClasses: ['2AM-3', '3AM-2', '4AM-1', '4AM-3'], // 2م3، 3م2، 4م1، 4م3
  },
  {
    identifier: '1097248010133200',
    surname: 'بصغير',
    firstName: 'العيد',
    birthDate: '1972-06-17',
    rank: 'أستاذ مميز في التعليم المتوسط',
    subjectName: 'اللغة الإنجليزية',
    subjectId: 'english',
    role: 'teacher',
    grade: 10,
    effectiveDate: '2025-01-01',
    email: 'besseghir.laid@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-1', '2AM-3', '3AM-1', '3AM-2'], // 1م1، 1م2، 1م3، 2م1، 2م3، 3م1، 3م2
  },
  {
    identifier: '1097848010999900',
    surname: 'عريبي',
    firstName: 'الطيب',
    birthDate: '1978-11-20',
    rank: 'أستاذ التعليم المتوسط',
    subjectName: 'التربية الإسلامية',
    subjectId: 'islamic',
    role: 'teacher',
    grade: 8,
    effectiveDate: '2025-01-01',
    email: 'aribi.eltayeb@education.dz',
    assignedClasses: ['1AM-1', '1AM-2', '1AM-3', '2AM-1', '2AM-2', '2AM-3', '3AM-1', '3AM-2', '4AM-1', '4AM-2', '4AM-3'],
  },

  // ================= 3. الطاقم الإداري والمشرفون =================
  {
    identifier: '1197748280037000',
    surname: 'مكي',
    firstName: 'حفيظة',
    birthDate: '1977-06-12',
    rank: 'مقتصدة',
    role: 'staff',
    grade: 5,
    effectiveDate: '2025-01-30',
    email: 'mekki.hafida@education.dz',
  },
  {
    identifier: '1198148010058700',
    surname: 'عزيزي',
    firstName: 'نورية',
    birthDate: '1981-02-14',
    rank: 'مستشارة التوجيه والإرشاد المدرسي والمهني',
    role: 'staff',
    grade: 2,
    effectiveDate: '2025-01-01',
    email: 'azizi.nouria@education.dz',
  },

  // ================= 3. سلك مشرفي التربية =================
  {
    identifier: '1098548010401400',
    surname: 'كيحل',
    firstName: 'عبد الكريم',
    birthDate: '1985-04-14',
    rank: 'مشرف رئيس للتربية',
    role: 'staff',
    grade: 6,
    effectiveDate: '2025-01-01',
    email: 'kihal.abdelkrim@education.dz',
  },
  {
    identifier: '1096548010046600',
    surname: 'عدة واضح',
    firstName: 'محمد',
    birthDate: '1965-03-06',
    rank: 'مشرف التربية',
    role: 'staff',
    grade: 12,
    effectiveDate: '2025-01-01',
    email: 'addouadeh.mohammed@education.dz',
  },
  {
    identifier: '1197448010085800',
    surname: 'تسرات',
    firstName: 'فريدة',
    birthDate: '1974-03-24',
    rank: 'مشرفة التربية',
    role: 'staff',
    grade: 4,
    effectiveDate: '2025-06-06',
    email: 'tessarat.farida@education.dz',
  },

  // ================= 4. الإدارة والكتابة وحفظ البيانات =================
  {
    identifier: '1198448010291100',
    surname: 'بلفضيل',
    firstName: 'زهرة',
    birthDate: '1984-07-23',
    rank: 'عون إدارة',
    role: 'staff',
    grade: 5,
    effectiveDate: '2022-07-07',
    email: 'belfadil.zohra@education.dz',
  },
  {
    identifier: '1196829010171300',
    surname: 'عروسي',
    firstName: 'صافية',
    birthDate: '1968-08-27',
    rank: 'عون حفظ البيانات',
    role: 'staff',
    grade: 6,
    effectiveDate: '2024-02-20',
    email: 'aaroussi.safia@education.dz',
  },
  {
    identifier: '1198448010187500',
    surname: 'عليوي',
    firstName: 'أمال',
    birthDate: '1984-05-08',
    rank: 'كاتبة',
    role: 'staff',
    grade: 2,
    effectiveDate: '2024-11-01',
    email: 'alioui.amal@education.dz',
  },
  {
    identifier: '1097548180004100',
    surname: 'بوقروج',
    firstName: 'حبيب',
    birthDate: '1975-01-29',
    rank: 'عون الوقاية من المستوى الأول',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
    email: 'boukroudj.habib@education.dz',
  },

  // ================= 5. العمال المهنيون =================
  {
    identifier: '1097448010013800',
    surname: 'بن سعيد',
    firstName: 'فوزي',
    birthDate: '1974-01-15',
    rank: 'عامل مهني خارج الصنف',
    role: 'staff',
    grade: 12,
    effectiveDate: '2024-07-01',
  },
  {
    identifier: '1096848010046100',
    surname: 'منصوري',
    firstName: 'بوزيان',
    birthDate: '1968-02-24',
    rank: 'عامل مهني',
    role: 'staff',
    grade: 9,
    effectiveDate: '2025-10-25',
  },
  {
    identifier: '1097448120019600',
    surname: 'بن تاجة',
    firstName: 'محمد',
    birthDate: '1974-02-15',
    rank: 'عامل مهني من الصنف الأول',
    role: 'staff',
    grade: 8,
    effectiveDate: '2024-11-27',
  },
  {
    identifier: '1197748010063000',
    surname: 'رابح',
    firstName: 'فاطمة',
    birthDate: '1977-02-18',
    rank: 'عامل مهني من المستوى الأول توقيت كامل',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
  },
  {
    identifier: '1097948010042900',
    surname: 'ضياف',
    firstName: 'عبد القادر',
    birthDate: '1979-02-01',
    rank: 'عامل مهني من المستوى الأول توقيت كامل',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
  },
  {
    identifier: '1097048010178100',
    surname: 'غربيل',
    firstName: 'عبد القادر',
    birthDate: '1970-09-12',
    rank: 'عامل مهني من المستوى الأول توقيت كامل',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
  },
  {
    identifier: '1097148060003400',
    surname: 'بن حليمة',
    firstName: 'محمد',
    birthDate: '1971-12-31',
    rank: 'عامل مهني من المستوى الأول توقيت كامل',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
  },
  {
    identifier: '1098448010147900',
    surname: 'بيت الله',
    firstName: 'عبد القادر',
    birthDate: '1984-04-05',
    rank: 'عامل مهني من المستوى الأول توقيت كامل',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
  },
  {
    identifier: '1097848010302000',
    surname: 'بن مجاهد',
    firstName: 'علي',
    birthDate: '1978-09-15',
    rank: 'عامل مهني من المستوى الثالث توقيت كامل',
    role: 'staff',
    grade: 0,
    effectiveDate: '2025-01-01',
  },
];

// Helper to convert OfficialStaffMember to UserProfile
export function toStaffUserProfile(member: OfficialStaffMember): UserProfile {
  let roleTitle = member.rank;
  if (member.subjectName) {
    roleTitle += ` (${member.subjectName})`;
  }

  return {
    id: `staff-${member.identifier}`,
    identifier: member.identifier,
    name: `${member.surname} ${member.firstName}`,
    role: member.role,
    title: roleTitle,
    rank: member.rank,
    pin: member.pin,
    email: member.email || `${member.identifier}@education.dz`,
    subjects: member.subjectId ? [member.subjectId] : undefined,
    assignedClasses: member.assignedClasses,
  };
}

// قائمة العمال المهنيين المسندين للمقتصدة حصرياً
export function getWorkersList(): OfficialStaffMember[] {
  return OFFICIAL_STAFF_LIST.filter(
    s => s.rank.includes('عامل مهني') || s.rank.includes('عون الوقاية')
  );
}

// قائمة مشرفي التربية التابعين لإشراف ومسؤولية الناظرة
export function getSupervisorsList(): OfficialStaffMember[] {
  return OFFICIAL_STAFF_LIST.filter(
    s => s.rank.includes('مشرف') || s.rank.includes('مشرفة')
  );
}

// التحقق هل الأستاذ مسند لهذا القسم تحديداً (استناداً إلى جدول التوقيت العام المعتمد)
export function isTeacherAssignedToClass(authorNameOrId: string, classId: string): boolean {
  if (!authorNameOrId || !classId) return false;
  const raw = authorNameOrId.trim();
  const cleanKey = raw.toLowerCase();
  const idKey = cleanKey.replace(/^staff-/, '');

  // Find teacher by identifier or name
  const teacher = OFFICIAL_STAFF_LIST.find(s => {
    if (s.role !== 'teacher') return false;
    if (s.identifier === idKey || s.identifier === cleanKey) return true;
    if (cleanKey.includes(s.identifier)) return true;

    const fullName = `${s.surname} ${s.firstName}`.toLowerCase();
    const reverseName = `${s.firstName} ${s.surname}`.toLowerCase();
    if (cleanKey === fullName || cleanKey === reverseName) return true;
    if (cleanKey.includes(fullName) || cleanKey.includes(reverseName)) return true;

    // Matching by surname if at least 3 characters
    if (s.surname.length >= 3 && cleanKey.includes(s.surname.toLowerCase())) return true;
    return false;
  });

  if (!teacher) {
    // If not found as a teacher (e.g. Director or Censor publishing institutional docs), allow
    const isOtherStaff = OFFICIAL_STAFF_LIST.some(
      s => (s.role === 'director' || s.role === 'censor') &&
           (s.identifier === idKey || cleanKey.includes(s.surname.toLowerCase()))
    );
    return isOtherStaff;
  }

  if (!teacher.assignedClasses || teacher.assignedClasses.length === 0) {
    return false;
  }

  return teacher.assignedClasses.includes(classId);
}

// جلب الأقسام المسندة لأستاذ محدد
export function getTeacherAssignedClasses(identifierOrName: string): string[] {
  if (!identifierOrName) return [];
  const raw = identifierOrName.trim();
  const cleanKey = raw.toLowerCase();
  const idKey = cleanKey.replace(/^staff-/, '');

  const teacher = OFFICIAL_STAFF_LIST.find(s => {
    if (s.role !== 'teacher') return false;
    if (s.identifier === idKey || s.identifier === cleanKey) return true;
    const fullName = `${s.surname} ${s.firstName}`.toLowerCase();
    return cleanKey.includes(fullName) || (s.surname.length >= 3 && cleanKey.includes(s.surname.toLowerCase()));
  });

  return teacher?.assignedClasses || [];
}

// معلومات أستاذ المادة المسند لقسم
export interface ClassTeacherInfo {
  subjectId: SubjectId;
  subjectName: string;
  teacherName: string;
  teacherIdentifier: string;
  rank: string;
}

// جلب قائمة الأساتذة الرسميين المسندين لقسم محدد وفق جدول التوقيت العام
export function getTeachersForClass(classId: string): ClassTeacherInfo[] {
  if (!classId) return [];
  const results: ClassTeacherInfo[] = [];

  for (const staff of OFFICIAL_STAFF_LIST) {
    if (
      staff.role === 'teacher' &&
      staff.assignedClasses &&
      staff.assignedClasses.includes(classId) &&
      staff.subjectId &&
      staff.subjectName
    ) {
      results.push({
        subjectId: staff.subjectId,
        subjectName: staff.subjectName,
        teacherName: `${staff.surname} ${staff.firstName}`,
        teacherIdentifier: staff.identifier,
        rank: staff.rank,
      });
    }
  }

  return results;
}

