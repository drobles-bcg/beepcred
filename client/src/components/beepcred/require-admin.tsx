import { Navigate, Outlet } from 'react-router-dom';
import { ScreenLoader } from '@/components/screen-loader';
import { canAccessAdmin } from '@/lib/admin-access';
import { useAuth } from '@/providers/auth-provider';

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }
  if (!canAccessAdmin(user)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
