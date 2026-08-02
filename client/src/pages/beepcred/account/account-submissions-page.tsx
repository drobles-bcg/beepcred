import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '@/api/http';
import { useAuth } from '@/providers/auth-provider';

export function AccountSubmissionsPage() {
  const { user } = useAuth();
  const username = user?.username || '';

  const subQ = useQuery({
    queryKey: ['account', 'submissions', username],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/submissions`, {
        params: { limit: 48 },
      });
      return data as {
        images: Array<{
          id: string;
          thumbnail_url: string | null;
          image_url: string;
          plate?: { state: string; plate_number: string; display_plate_text?: string | null };
        }>;
        total: number;
      };
    },
    enabled: !!username,
  });

  return (
    <>
      <Helmet>
        <title>My submissions — BeepCred</title>
      </Helmet>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My submissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos you have uploaded ({subQ.data?.total ?? '…'}).
          </p>
        </div>
        {subQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!subQ.isLoading && (subQ.data?.images || []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            No photos yet.{' '}
            <Link to="/submit" className="text-primary underline">
              Submit a plate
            </Link>
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(subQ.data?.images || []).map((im) => {
            const p = im.plate;
            const href = p
              ? `/plate/${encodeURIComponent(p.state)}/${encodeURIComponent(p.display_plate_text || p.plate_number)}`
              : null;
            const img = (
              <img
                src={im.thumbnail_url || im.image_url}
                alt=""
                className="aspect-video w-full rounded-md object-cover"
              />
            );
            return href ? (
              <Link key={im.id} to={href} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring">
                {img}
              </Link>
            ) : (
              <div key={im.id}>{img}</div>
            );
          })}
        </div>
      </div>
    </>
  );
}
