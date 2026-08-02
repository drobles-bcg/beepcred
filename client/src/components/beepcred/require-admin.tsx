import { Navigate, Outlet } from 'react-router-dom';
import { ScreenLoader } from '@/components/screen-loader';
import { useAuth } from '@/providers/auth-provider';

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
