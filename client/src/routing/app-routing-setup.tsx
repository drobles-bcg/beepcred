import { Route, Routes, Navigate } from 'react-router';
import { Layout1 } from '@/components/layouts/layout-1';
import { RequireAuth } from '@/components/beepcred/require-auth';
import { RequireAdmin } from '@/components/beepcred/require-admin';
import { HomeGate } from '@/pages/beepcred/home-gate';
import { LoginPage } from '@/pages/beepcred/login-page';
import { RegisterPage } from '@/pages/beepcred/register-page';
import { PlatePage } from '@/pages/beepcred/plate-page';
import { UserProfilePage } from '@/pages/beepcred/user-profile-page';
import { SubmitPage } from '@/pages/beepcred/submit-page';
import { SearchPage } from '@/pages/beepcred/search-page';
import { AdminDashboardPage } from '@/pages/beepcred/admin-dashboard-page';
import { AdminUsersPage } from '@/pages/beepcred/admin-users-page';
import { AdminPlatesPage } from '@/pages/beepcred/admin-plates-page';
import { AdminImagesPage } from '@/pages/beepcred/admin-images-page';
import { AdminReportsPage } from '@/pages/beepcred/admin-reports-page';
import { AdminCommentsPage } from '@/pages/beepcred/admin-comments-page';
import { DocsPage } from '@/pages/beepcred/docs-page';
import { PurchasePage } from '@/pages/beepcred/purchase-page';
import { FaqPage } from '@/pages/beepcred/faq-page';
import { SupportPage } from '@/pages/beepcred/support-page';
import { LicensePage } from '@/pages/beepcred/license-page';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout1 />}>
        <Route path="/" element={<HomeGate />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/license" element={<LicensePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/plate/:state/:plate" element={<PlatePage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />

        <Route element={<RequireAuth />}>
          <Route path="/submit" element={<SubmitPage />} />
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/plates" element={<AdminPlatesPage />} />
          <Route path="/admin/images" element={<AdminImagesPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/comments" element={<AdminCommentsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
