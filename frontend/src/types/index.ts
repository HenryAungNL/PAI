/** Shared domain types mirroring the PAI REST API. */

export type UserRole = "student" | "instructor" | "admin";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  is_approved: boolean;
  is_suspended: boolean;
  avatar: string | null;
  avatar_url?: string;
  headline: string;
  bio: string;
  date_joined: string;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  full_name: string;
  avatar: string | null;
  headline: string;
  bio: string;
  role: UserRole;
  created_at: string;
}

export interface Instructor extends PublicUser {
  course_count?: number;
  student_count?: number;
  courses?: CourseListItem[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image_url: string;
  is_active: boolean;
  order: number;
  course_count?: number;
}

export type CourseStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface LessonSummary {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  order: number;
  is_preview: boolean;
}

export interface Lesson extends LessonSummary {
  content: string;
  video_url: string;
  attachment: string | null;
}

export interface Section<TLesson = LessonSummary | Lesson> {
  id: number;
  title: string;
  summary: string;
  order: number;
  lessons: TLesson[];
}

export interface CourseListItem {
  id: number;
  title: string;
  slug: string;
  subtitle: string;
  category: Category | null;
  instructor: Instructor;
  difficulty: Difficulty;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  price: string;
  is_free: boolean;
  average_rating: string;
  review_count: number;
  enrollment_count: number;
  lesson_count: number;
  total_duration_minutes: number;
  status: CourseStatus;
  published_at: string | null;
  created_at: string;
}

export interface CourseViewerState {
  is_authenticated: boolean;
  is_enrolled: boolean;
  is_owner: boolean;
  can_access_full: boolean;
}

export interface CourseDetail extends CourseListItem {
  description: string;
  learning_objectives: string[];
  requirements: string[];
  promo_video_url: string;
  sections: Section[];
  is_featured: boolean;
  updated_at: string;
  moderation_note?: string;
  viewer: CourseViewerState;
}

export interface Enrollment {
  id: number;
  student?: { id: number; full_name: string; email: string } | null;
  course: CourseListItem;
  enrolled_at: string;
  completed_at: string | null;
  last_accessed_at: string | null;
  progress_percent: number;
  is_completed: boolean;
}

export interface Bookmark {
  id: number;
  course: CourseListItem;
  created_at: string;
}

export interface CourseProgress {
  course_id: number;
  progress_percent: number;
  completed_lesson_ids: number[];
  completed_at: string | null;
  total_lessons: number;
}

export interface PlayerPayload {
  course: CourseDetail;
  sections: Section<Lesson>[];
  completed_lesson_ids: number[];
  progress_percent: number;
  enrollment_id: number | null;
}

export interface Review {
  id: number;
  course: number;
  course_title: string;
  student: PublicUser;
  rating: number;
  title: string;
  body: string;
  moderation_status: "visible" | "hidden";
  is_reported: boolean;
  is_demo: boolean;
  is_verified_enrollment: boolean;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: number;
  code: string;
  student_name: string;
  course_title: string;
  course_slug: string;
  final_score_percent: number;
  issued_at: string;
  verify_url: string;
}

export interface PublicCertificate {
  code: string;
  student_name: string;
  course_title: string;
  issued_at: string;
  final_score_percent: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_refunded";

export interface Money {
  amount_cents: number;
  amount: number;
  currency: string;
}

export interface PaymentRecord {
  id: number;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface RefundRecord {
  id: number;
  order: number;
  amount_cents: number;
  currency: string;
  reason: string;
  status: "pending" | "succeeded" | "failed";
  issued_by: string;
  created_at: string;
}

export interface Order {
  id: number;
  student: { id: number; full_name: string; email: string } | null;
  course: number | null;
  course_title: string;
  amount_cents: number;
  refunded_amount_cents: number;
  net_amount_cents: number;
  currency: string;
  status: OrderStatus;
  stripe_payment_intent_id: string;
  stripe_checkout_session_id: string;
  paid_at: string | null;
  created_at: string;
  payments: PaymentRecord[];
  refunds: RefundRecord[];
}

export interface OrderStatusResponse {
  order: Order;
  enrolled: boolean;
}

export interface PlatformStats {
  users: {
    total: number;
    students: number;
    instructors: number;
    admins: number;
    active: number;
    suspended: number;
    new_last_30_days: number;
  };
  courses: {
    total: number;
    published: number;
    pending: number;
    draft: number;
    rejected: number;
    archived: number;
  };
  enrollments: { total: number; completed: number; last_30_days: number };
  revenue: {
    gross: Money;
    refunded: Money;
    net: Money;
    last_30_days: Money;
    paid_orders: number;
    pending_orders: number;
  };
  reviews: { total: number; reported: number; average_rating: number };
  recent_registrations: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    created_at: string;
  }[];
  recent_transactions: {
    id: number;
    course_title: string;
    amount_cents: number;
    currency: string;
    paid_at: string;
    email: string;
  }[];
  enrollment_trend: { date: string; count: number }[];
  revenue_trend: { date: string; amount_cents: number }[];
}

export interface InstructorStats {
  totals: {
    courses: number;
    published: number;
    pending: number;
    drafts: number;
    students: number;
    enrollments: number;
    completions: number;
    gross_revenue: Money;
    refunded: Money;
    net_revenue: Money;
    average_rating: number;
  };
  courses: {
    id: number;
    title: string;
    slug: string;
    status: CourseStatus;
    price_cents: number;
    enrollment_count: number;
    completed_count: number;
    average_rating: number;
    review_count: number;
    gross_revenue: Money;
    refunded: Money;
    net_revenue: Money;
  }[];
  enrollment_trend: { date: string; count: number }[];
  revenue_trend: { date: string; amount_cents: number }[];
}

export interface PublicStats {
  courses: number;
  instructors: number;
  students: number;
  average_rating: number;
}

export interface SiteConfig {
  site_name: string;
  tagline: string;
  support_email: string;
  contact_phone: string;
  contact_address: string;
  twitter_url: string;
  linkedin_url: string;
  instagram_url: string;
  youtube_url: string;
  facebook_url: string;
  terms_url: string;
  privacy_url: string;
  refund_policy_url: string;
}

export interface PlatformSettings extends SiteConfig {
  allow_instructor_registration: boolean;
  stripe_test_mode: boolean;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  actor: number | null;
  actor_name: string;
  actor_email: string;
  action: string;
  object_type: string;
  object_id: string;
  object_repr: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AdminUser extends User {
  is_active: boolean;
  suspension_reason: string;
  course_count: number;
  enrollment_count: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
