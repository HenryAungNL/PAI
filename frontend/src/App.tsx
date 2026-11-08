import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedRoute, RoleRoute } from "@/components/layout/RouteGuards";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AdminCategoriesPage } from "@/pages/admin/AdminCategoriesPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminEnrollmentsPage } from "@/pages/admin/AdminEnrollmentsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminReviewsPage } from "@/pages/admin/AdminReviewsPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { CourseEditorPage } from "@/pages/instructor/CourseEditorPage";
import { InstructorAnalyticsPage } from "@/pages/instructor/InstructorAnalyticsPage";
import { InstructorCoursesPage } from "@/pages/instructor/InstructorCoursesPage";
import { InstructorDashboardPage } from "@/pages/instructor/InstructorDashboardPage";
import { PaymentCancelPage } from "@/pages/payments/PaymentCancelPage";
import { PaymentSuccessPage } from "@/pages/payments/PaymentSuccessPage";
import { AboutPage } from "@/pages/public/AboutPage";
import { CategoriesPage } from "@/pages/public/CategoriesPage";
import { ContactPage } from "@/pages/public/ContactPage";
import { CourseDetailPage } from "@/pages/public/CourseDetailPage";
import { CoursesPage } from "@/pages/public/CoursesPage";
import { HomePage } from "@/pages/public/HomePage";
import { InstructorDetailPage } from "@/pages/public/InstructorDetailPage";
import { InstructorsPage } from "@/pages/public/InstructorsPage";
import { LegalPage } from "@/pages/public/LegalPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";
import { VerifyCertificatePage } from "@/pages/public/VerifyCertificatePage";
import { BookmarksPage } from "@/pages/student/BookmarksPage";
import { CertificatePage } from "@/pages/student/CertificatePage";
import { CertificatesPage } from "@/pages/student/CertificatesPage";
import { CoursePlayerPage } from "@/pages/student/CoursePlayerPage";
import { DashboardPage } from "@/pages/student/DashboardPage";
import { MyLearningPage } from "@/pages/student/MyLearningPage";
import { OrdersPage } from "@/pages/student/OrdersPage";
import { SettingsPage } from "@/pages/student/SettingsPage";

/**
 * Application router.
 *
 * Layout groups:
 *  - PublicLayout   → marketing & catalogue pages
 *  - AuthLayout     → rendered by the auth pages themselves
 *  - DashboardShell → student / instructor workspaces (adapts to the role)
 *  - AdminLayout    → the custom React admin dashboard
 *
 * Authorization is enforced twice: these guards shape the UX, and the REST API
 * independently rejects unauthorised requests.
 */
const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/courses", element: <CoursesPage /> },
      { path: "/courses/:slug", element: <CourseDetailPage /> },
      { path: "/categories", element: <CategoriesPage /> },
      { path: "/instructors", element: <InstructorsPage /> },
      { path: "/instructors/:id", element: <InstructorDetailPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/verify", element: <VerifyCertificatePage /> },
      { path: "/legal/terms", element: <LegalPage kind="terms" /> },
      { path: "/legal/privacy", element: <LegalPage kind="privacy" /> },
      { path: "/legal/refunds", element: <LegalPage kind="refund" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },

  // Authentication screens render their own split layout.
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      // Checkout landing pages (full-screen, no shell).
      { path: "/payment/success", element: <PaymentSuccessPage /> },
      { path: "/payment/cancel", element: <PaymentCancelPage /> },
      { path: "/certificate/:code", element: <CertificatePage /> },

      // Account settings are shared by learners and instructors.
      {
        element: <RoleRoute roles={["student", "instructor"]} />,
        children: [
          {
            element: <DashboardLayout />,
            children: [{ path: "/dashboard/settings", element: <SettingsPage /> }],
          },
        ],
      },

      // Student workspace.
      {
        element: <RoleRoute roles={["student"]} />,
        children: [
          { path: "/dashboard/course/:id", element: <CoursePlayerPage /> },
          {
            element: <DashboardLayout />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/dashboard/learning", element: <MyLearningPage /> },
              { path: "/dashboard/bookmarks", element: <BookmarksPage /> },
              { path: "/dashboard/certificates", element: <CertificatesPage /> },
              { path: "/dashboard/orders", element: <OrdersPage /> },
            ],
          },
        ],
      },

      // Instructor workspace.
      {
        element: <RoleRoute roles={["instructor"]} />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: "/instructor", element: <InstructorDashboardPage /> },
              { path: "/instructor/courses", element: <InstructorCoursesPage /> },
              { path: "/instructor/courses/new", element: <CourseEditorPage /> },
              { path: "/instructor/courses/:id/edit", element: <CourseEditorPage /> },
              { path: "/instructor/analytics", element: <InstructorAnalyticsPage /> },
            ],
          },
        ],
      },

      // Platform administration.
      {
        element: <RoleRoute roles={["admin"]} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: "/admin", element: <AdminDashboardPage /> },
              { path: "/admin/users", element: <AdminUsersPage /> },
              { path: "/admin/courses", element: <AdminCoursesPage /> },
              { path: "/admin/categories", element: <AdminCategoriesPage /> },
              { path: "/admin/enrollments", element: <AdminEnrollmentsPage /> },
              { path: "/admin/orders", element: <AdminOrdersPage /> },
              { path: "/admin/reviews", element: <AdminReviewsPage /> },
              { path: "/admin/audit", element: <AdminAuditPage /> },
              { path: "/admin/settings", element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
