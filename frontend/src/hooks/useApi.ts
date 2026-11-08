import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, buildQuery } from "@/lib/api";
import type {
  AdminUser,
  AuditLogEntry,
  Bookmark,
  Category,
  Certificate,
  CourseDetail,
  CourseListItem,
  CourseProgress,
  Enrollment,
  Instructor,
  InstructorStats,
  Lesson,
  Order,
  OrderStatusResponse,
  Paginated,
  PlayerPayload,
  PlatformSettings,
  PlatformStats,
  PublicCertificate,
  PublicStats,
  Review,
  Section,
  SiteConfig,
  User,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Public catalog                                                      */
/* ------------------------------------------------------------------ */

export interface CourseFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  price_max?: number;
  min_rating?: number;
  free?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export function useCourses(filters: CourseFilters = {}) {
  return useQuery({
    queryKey: ["courses", filters],
    queryFn: () =>
      api.get<Paginated<CourseListItem>>(
        `/courses/${buildQuery({
          search: filters.search,
          category: filters.category,
          difficulty: filters.difficulty,
          price_max: filters.price_max,
          min_rating: filters.min_rating,
          free: filters.free ? "true" : undefined,
          sort: filters.sort,
          page: filters.page,
          page_size: filters.page_size,
        })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useCourse(slug: string | undefined) {
  return useQuery({
    queryKey: ["course", slug],
    queryFn: () => api.get<CourseDetail>(`/courses/${slug}/`),
    enabled: Boolean(slug),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories/"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstructors(limit?: number) {
  return useQuery({
    queryKey: ["instructors", limit],
    queryFn: () => api.get<Instructor[]>(`/instructors/${buildQuery({ limit })}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstructor(id: number | undefined) {
  return useQuery({
    queryKey: ["instructor", id],
    queryFn: () => api.get<Instructor>(`/instructors/${id}/`),
    enabled: Boolean(id),
  });
}

export function usePublicStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: () => api.get<PublicStats>("/analytics/public/"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSiteConfig() {
  return useQuery({
    queryKey: ["site-config"],
    queryFn: () => api.get<SiteConfig>("/analytics/site-config/"),
    staleTime: 10 * 60 * 1000,
  });
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export function useCourseReviews(courseId: number | undefined, page = 1) {
  return useQuery({
    queryKey: ["course-reviews", courseId, page],
    queryFn: () => api.get<Paginated<Review>>(`/courses/${courseId}/reviews/${buildQuery({ page })}`),
    enabled: Boolean(courseId),
  });
}

export function useMyReview(courseId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["my-review", courseId],
    queryFn: () => api.get<{ review: Review | null }>(`/courses/${courseId}/my-review/`),
    enabled: Boolean(courseId) && enabled,
  });
}

export function useSubmitReview(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rating: number; title?: string; body?: string }) =>
      api.post<Review>(`/courses/${courseId}/my-review/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-reviews", courseId] });
      qc.invalidateQueries({ queryKey: ["my-review", courseId] });
      qc.invalidateQueries({ queryKey: ["course"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Student learning                                                    */
/* ------------------------------------------------------------------ */

export function useMyEnrollments(status?: "in_progress" | "completed") {
  return useQuery({
    queryKey: ["my-enrollments", status],
    queryFn: () => api.get<Enrollment[]>(`/my/enrollments/${buildQuery({ status })}`),
  });
}

export function usePlayer(courseId: number | undefined) {
  return useQuery({
    queryKey: ["player", courseId],
    queryFn: () => api.get<PlayerPayload>(`/my/courses/${courseId}/player/`),
    enabled: Boolean(courseId),
  });
}

export function useCourseProgress(courseId: number | undefined) {
  return useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: () => api.get<CourseProgress>(`/my/courses/${courseId}/progress/`),
    enabled: Boolean(courseId),
  });
}

export function useToggleLessonComplete(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, completed }: { lessonId: number; completed: boolean }) =>
      api.post<{ progress_percent: number; course_completed: boolean; completed: boolean }>(
        `/my/lessons/${lessonId}/complete/`,
        { completed },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player", courseId] });
      qc.invalidateQueries({ queryKey: ["course-progress", courseId] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["my-certificates"] });
    },
  });
}

export function useBookmarks() {
  return useQuery({
    queryKey: ["my-bookmarks"],
    queryFn: () => api.get<Bookmark[]>("/my/bookmarks/"),
  });
}

export function useAddBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: number) => api.post<Bookmark>("/my/bookmarks/", { course_id: courseId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookmarks"] }),
  });
}

export function useRemoveBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: number) => api.delete(`/my/bookmarks/${courseId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookmarks"] }),
  });
}

export function useMyCertificates() {
  return useQuery({
    queryKey: ["my-certificates"],
    queryFn: () => api.get<Certificate[]>("/my/certificates/"),
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: number) => api.post<Certificate>(`/my/courses/${courseId}/certificate/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-certificates"] }),
  });
}

export function useVerifyCertificate(code: string | undefined) {
  return useQuery({
    queryKey: ["verify-certificate", code],
    queryFn: () => api.get<{ valid: boolean; certificate: PublicCertificate }>(`/certificates/verify/${code}/`),
    enabled: Boolean(code),
    retry: false,
  });
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export function useMyOrders() {
  return useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get<Order[]>("/my/orders/"),
  });
}

export function useOrderStatus(orderId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["order-status", orderId],
    queryFn: () => api.get<OrderStatusResponse>(`/my/orders/${orderId}/status/`),
    enabled: Boolean(orderId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as OrderStatusResponse | undefined;
      // Poll until the backend has verified the payment.
      if (data && (data.order.status === "pending" || !data.enrolled)) return 3000;
      return false;
    },
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (courseId: number) =>
      api.post<{ url: string; order_id: number; session_id: string }>("/payments/checkout/", {
        course_id: courseId,
      }),
  });
}

export function useEnrollFree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: number) => api.post("/payments/enroll-free/", { course_id: courseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["course"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Home page helpers                                                   */
/* ------------------------------------------------------------------ */

export function usePopularCourses() {
  return useQuery({
    queryKey: ["courses", "popular"],
    queryFn: () => api.get<Paginated<CourseListItem>>("/courses/?sort=popular&page_size=8"),
    staleTime: 5 * 60 * 1000,
  });
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Pick<User, "first_name" | "last_name" | "headline" | "bio">>) =>
      api.patch<User>("/users/me/", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      api.post<{ detail: string }>("/users/me/password/", payload),
  });
}

/* ------------------------------------------------------------------ */
/* Instructor authoring                                                */
/* ------------------------------------------------------------------ */

export interface InstructorCourseFilters {
  status?: string;
  search?: string;
  page?: number;
}

export function useInstructorCourses(filters: InstructorCourseFilters = {}) {
  return useQuery({
    queryKey: ["instructor-courses", filters],
    queryFn: () =>
      api.get<Paginated<CourseListItem>>(
        `/instructor/courses/${buildQuery({ status: filters.status, search: filters.search, page: filters.page })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useInstructorCourse(id: number | undefined) {
  return useQuery({
    queryKey: ["instructor-course", id],
    queryFn: () => api.get<CourseDetail>(`/instructor/courses/${id}/`),
    enabled: Boolean(id),
  });
}

type CourseWriteInput = {
  title: string;
  subtitle?: string;
  description: string;
  learning_objectives?: string[];
  requirements?: string[];
  category?: number | null;
  difficulty: string;
  price_cents: number;
  currency?: string;
  thumbnail_url?: string;
  promo_video_url?: string;
};

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CourseWriteInput) => api.post<CourseDetail>("/instructor/courses/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      qc.invalidateQueries({ queryKey: ["instructor-course", undefined] });
    },
  });
}

export function useUpdateCourse(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CourseWriteInput>) =>
      api.patch<CourseDetail>(`/instructor/courses/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      qc.invalidateQueries({ queryKey: ["instructor-course", id] });
    },
  });
}

export function useUploadCourseThumbnail(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("thumbnail", file);
      return api.upload<CourseDetail>(`/instructor/courses/${id}/`, form, "PATCH");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      qc.invalidateQueries({ queryKey: ["instructor-course", id] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/instructor/courses/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instructor-courses"] }),
  });
}

export function useSubmitCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ detail: string; status: string }>(`/instructor/courses/${id}/submit/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      qc.invalidateQueries({ queryKey: ["instructor-course"] });
    },
  });
}

export function useArchiveCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ detail: string; status: string }>(`/instructor/courses/${id}/archive/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      qc.invalidateQueries({ queryKey: ["instructor-course"] });
    },
  });
}

export function useCourseSections(courseId: number | undefined) {
  return useQuery({
    queryKey: ["course-sections", courseId],
    queryFn: () => api.get<Section[]>(`/instructor/courses/${courseId}/sections/`),
    enabled: Boolean(courseId),
  });
}

export function useCreateSection(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; summary?: string; order?: number }) =>
      api.post<Section>(`/instructor/courses/${courseId}/sections/`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-sections", courseId] }),
  });
}

export function useUpdateSection(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; title?: string; summary?: string; order?: number }) =>
      api.patch<Section>(`/instructor/sections/${id}/`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-sections", courseId] }),
  });
}

export function useDeleteSection(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/instructor/sections/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-sections", courseId] }),
  });
}

export function useInstructorLesson(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["instructor-lesson", id],
    queryFn: () => api.get<Lesson>(`/instructor/lessons/${id}/`),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateLesson(sectionId: number, courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      content?: string;
      video_url?: string;
      duration_minutes?: number;
      order?: number;
      is_preview?: boolean;
    }) => api.post<Section>(`/instructor/sections/${sectionId}/lessons/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-sections", courseId] });
      qc.invalidateQueries({ queryKey: ["instructor-course", courseId] });
    },
  });
}

export function useUpdateLesson(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      title?: string;
      description?: string;
      content?: string;
      video_url?: string;
      duration_minutes?: number;
      order?: number;
      is_preview?: boolean;
    }) => api.patch(`/instructor/lessons/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-sections", courseId] });
      qc.invalidateQueries({ queryKey: ["instructor-course", courseId] });
    },
  });
}

export function useDeleteLesson(courseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/instructor/lessons/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-sections", courseId] });
      qc.invalidateQueries({ queryKey: ["instructor-course", courseId] });
    },
  });
}

export function useInstructorStats() {
  return useQuery({
    queryKey: ["instructor-stats"],
    queryFn: () => api.get<InstructorStats>("/analytics/instructor/"),
  });
}

/* ------------------------------------------------------------------ */
/* Admin dashboard                                                     */
/* ------------------------------------------------------------------ */

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<PlatformStats>("/admin/stats/"),
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<PlatformSettings>("/admin/settings/"),
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PlatformSettings>) => api.patch<PlatformSettings>("/admin/settings/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
}

export interface AdminUserFilters {
  role?: string;
  status?: string;
  search?: string;
  pending_instructors?: boolean;
  page?: number;
}

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () =>
      api.get<Paginated<AdminUser>>(
        `/admin/users/${buildQuery({
          role: filters.role,
          status: filters.status,
          search: filters.search,
          pending_instructors: filters.pending_instructors ? "true" : undefined,
          page: filters.page,
        })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<AdminUser>) =>
      api.patch<AdminUser>(`/admin/users/${id}/`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, suspend, reason }: { id: number; suspend: boolean; reason?: string }) =>
      api.post<AdminUser>(`/admin/users/${id}/suspend/`, { suspend, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useApproveInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) =>
      api.post<AdminUser>(`/admin/users/${id}/approve-instructor/`, { approve }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export interface AdminCourseFilters {
  status?: string;
  search?: string;
  page?: number;
}

export function useAdminCourses(filters: AdminCourseFilters = {}) {
  return useQuery({
    queryKey: ["admin-courses", filters],
    queryFn: () =>
      api.get<Paginated<CourseListItem>>(
        `/admin/courses/${buildQuery({ status: filters.status, search: filters.search, page: filters.page })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useModerateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "approve" | "reject" | "archive" | "restore"; note?: string }) =>
      api.post<CourseDetail>(`/admin/courses/${id}/moderate/`, { action, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useFeatureCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, featured }: { id: number; featured: boolean }) =>
      api.post<{ id: number; is_featured: boolean }>(`/admin/courses/${id}/feature/`, { featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get<Category[]>("/admin/categories/"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Category>) => api.post<Category>("/admin/categories/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Category>) =>
      api.patch<Category>(`/admin/categories/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export interface AdminEnrollmentFilters {
  status?: string;
  search?: string;
  page?: number;
}

export function useAdminEnrollments(filters: AdminEnrollmentFilters = {}) {
  return useQuery({
    queryKey: ["admin-enrollments", filters],
    queryFn: () =>
      api.get<Paginated<Enrollment>>(
        `/admin/enrollments/${buildQuery({ status: filters.status, search: filters.search, page: filters.page })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export interface AdminOrderFilters {
  status?: string;
  search?: string;
  page?: number;
}

export function useAdminOrders(filters: AdminOrderFilters = {}) {
  return useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () =>
      api.get<Paginated<Order>>(
        `/admin/orders/${buildQuery({ status: filters.status, search: filters.search, page: filters.page })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, amount_cents, reason }: { orderId: number; amount_cents: number; reason?: string }) =>
      api.post(`/admin/orders/${orderId}/refund/`, { amount_cents, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export interface AdminReviewFilters {
  status?: string;
  reported?: boolean;
  search?: string;
  page?: number;
}

export function useAdminReviews(filters: AdminReviewFilters = {}) {
  return useQuery({
    queryKey: ["admin-reviews", filters],
    queryFn: () =>
      api.get<Paginated<Review>>(
        `/admin/reviews/${buildQuery({
          status: filters.status,
          reported: filters.reported ? "true" : undefined,
          search: filters.search,
          page: filters.page,
        })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      moderation_status,
      clear_report,
    }: {
      id: number;
      moderation_status: "visible" | "hidden";
      clear_report?: boolean;
    }) => api.patch<Review>(`/admin/reviews/${id}/`, { moderation_status, clear_report }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/reviews/${id}/delete/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export interface AuditLogFilters {
  action?: string;
  object_type?: string;
  search?: string;
  page?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["admin-audit-logs", filters],
    queryFn: () =>
      api.get<Paginated<AuditLogEntry>>(
        `/admin/audit-logs/${buildQuery({
          action: filters.action,
          object_type: filters.object_type,
          search: filters.search,
          page: filters.page,
        })}`,
      ),
    placeholderData: (prev) => prev,
  });
}
