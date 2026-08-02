import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/http';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  const stats = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/stats');
      return data as {
        total_users: number;
        total_plates: number;
        pending_reports: number;
        images_awaiting_review: number;
      };
    },
  });

  const s = stats.data;

  return (
    <>
      <Helmet>
        <title>Admin — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-6 text-2xl font-bold">Admin</h1>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{s?.total_users ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Plates</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{s?.total_plates ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending reports</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{s?.pending_reports ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Images queue</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{s?.images_awaiting_review ?? '—'}</CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/admin/users" className="text-primary underline">
            Users
          </Link>
          <Link to="/admin/plates" className="text-primary underline">
            Plates
          </Link>
          <Link to="/admin/images" className="text-primary underline">
            Images
          </Link>
          <Link to="/admin/reports" className="text-primary underline">
            Reports
          </Link>
          <Link to="/admin/comments" className="text-primary underline">
            Comments
          </Link>
        </div>
      </div>
    </>
  );
}
