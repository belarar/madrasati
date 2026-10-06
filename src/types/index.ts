export type UserRole = 'student' | 'teacher' | 'censor' | 'director' | 'staff';

export type EducationLevel = '1AM' | '2AM' | '3AM' | '4AM'; // السنة الأولى، الثانية، الثالثة، الرابعة متوسط

export interface SchoolClass {
  id: string; // e.g. "4AM-1"
  name: string; // "4 متوسط 1"
  level: EducationLevel;
  studentCount: number;
}

export type SubjectId =
  | 'math'
  | 'arabic'
  | 'physics'
  | 'science'
  | 'french'
  | 'english'
  | 'history_geo'
  | 'islamic'
  | 'civics'
  | 'sport'
  | 'art'
  | 'informatics'
  | 'admin';

export interface Subject {
  id: SubjectId;
  name: string;
  iconName: string;
  color: string;
}

export type DocType =
  | 'lesson' // درس
  | 'homework' // واجب منزلي
  | 'test' // فرض محروس
  | 'summary' // ملخص شامل
  | 'exercise' // سلسلة تمارين
  | 'bem_prep' // تحضير شهادة التعليم المتوسط
  | 'admin_note' // منشور إداري
  | 'circular'; // مراسلة وزارية/داخلية

export type FileFormat = 'pdf' | 'docx' | 'doc' | 'xlsx' | 'pptx' | 'image';

export type DocumentTargetAudience =
  | 'all_students' // جميع التلاميذ
  | 'specific_class' // قسم معين
  | 'specific_student' // تلميذ معين
  | 'teachers' // السادة الأساتذة
  | 'staff'; // موظفون آخرون / الإدارة والتربية

export interface SchoolDocument {
  id: string;
  title: string;
  description: string;
  subject: SubjectId;
  docType: DocType;
  fileFormat: FileFormat;
  fileName: string;
  fileSize: string;
  fileDataUrl?: string; // Base64 or Blob URL for real download
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'director' | 'censor';
  targetAudience?: DocumentTargetAudience; // الجمهور المستهدف
  targetClasses: string[]; // Class IDs like ["4AM-1", "4AM-2"] or ["ALL"]
  targetStudentId?: string; // For a specific student
  targetStudentName?: string; // For a specific student
  targetLevel?: EducationLevel;
  uploadDate: string; // ISO date string
  downloadCount: number;
}

export type AnnouncementTarget = 'all' | 'students' | 'teachers' | 'staff';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  target: AnnouncementTarget;
  targetClass?: string; // Optional: specific class
  priority: AnnouncementPriority;
  authorName: string;
  authorRole: 'director' | 'censor' | 'teacher';
  createdAt: string;
  badge?: string;
  views?: number;
  fileName?: string;
  fileSize?: string;
  fileFormat?: FileFormat;
  fileDataUrl?: string;
}

export type SummonReason =
  | 'absence' // غيابات متكررة وتأخرات
  | 'discipline' // سلوك وانضباط
  | 'grades' // تدني النتائج المدرسية
  | 'admin' // موعد إداري عاجل
  | 'report_card' // استلام كشف النقاط
  | 'other'; // سبب آخر

export interface ParentSummon {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  guardianName: string;
  guardianPhone: string;
  reason: SummonReason;
  reasonDetails?: string;
  appointmentDate: string;
  appointmentTime: string;
  issuedBy: string; // 'الناظر' or 'مستشار التربية'
  issuedAt: string;
  status: 'sent' | 'viewed' | 'attended' | 'cancelled';
  notes?: string;
}

export interface UserProfile {
  id: string; // Student ID or Professional ID
  name: string;
  role: UserRole;
  identifier: string; // رقم التعريف المدرسي أو المهني
  pin?: string; // كلمة السر
  email?: string; // البريد الإلكتروني لاسترجاع الحساب
  classId?: string; // For students
  className?: string; // For students
  subjects?: SubjectId[]; // For teachers
  assignedClasses?: string[]; // For teachers
  title?: string; // e.g. "مدير المؤسسة", "ناظر المتوسطة", "أستاذ التعليم المتوسط"
  phone?: string;
  avatarUrl?: string;
}

// ================= قناة التضامن والتبادل بين تلاميذ القسم =================
export type PeerExchangeType =
  | 'missed_lesson' // درس فاتني / نقل من السبورة
  | 'homework_help' // واجب منزلي / حل تمرين
  | 'summary_notes' // ملخص كراس / مراجعة
  | 'absence_catchup' // استدراك بعد غياب
  | 'lesson_request'; // طلب تصوير درس من الزملاء

export interface PeerExchangeReply {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  createdAt: string;
  fileName?: string;
  fileSize?: string;
  fileDataUrl?: string;
  fileFormat?: FileFormat;
}

export interface PeerExchangePost {
  id: string;
  classId: string; // معرف القسم (مثل 2AM-2 أو 4AM-1)
  className: string; // اسم القسم
  studentId: string; // رقم تعريف التلميذ الناشر
  studentName: string; // اسم التلميذ
  subjectId: SubjectId;
  type: PeerExchangeType;
  title: string;
  content: string;
  hasAttachment?: boolean;
  fileName?: string;
  fileSize?: string;
  fileDataUrl?: string; // Base64 or Blob URL for real download
  fileFormat?: FileFormat;
  createdAt: string;
  thanksCount: number;
  thankedBy: string[]; // studentIds who thanked
  replies: PeerExchangeReply[];
}

// ================= نظام التنبيهات والإشعارات =================
export interface AppNotification {
  id: string;
  type: 'document' | 'announcement' | 'summon' | 'peer_post' | 'peer_reply';
  title: string;
  message: string;
  targetRole?: 'all' | 'students' | 'teachers' | 'staff' | 'director' | 'censor';
  targetClassId?: string; // e.g. '4AM-1'
  targetUserId?: string; // e.g. student identifier
  sourceAuthorName: string;
  sourceId?: string;
  createdAt: string;
  readBy: string[]; // user identifiers who opened it
}

