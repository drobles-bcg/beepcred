import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '@/api/http';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';

export function AccountRatingsPage() {
  const { user } = useAuth();
  const username = user?.username || '';

  const votesQ = useQuery({
    queryKey: ['account', 'ratings', username],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/votes`, {
        params: { limit: 50 },
      });
      return data as {
        votes: Array<{
          id: string;
          vote: number;
          reason_tag?: string | null;
          created_at?: string;
          plate?: {
            id: string;
            state: string;
            plate_number: string;
            slug: string;
            cred_score: number;
          };
        }>;
        total: number;
      };
    },
    enabled: !!username,
  });

  return (
    <>
      <Helmet>
        <title>My ratings — BeepCred</title>
      </Helmet>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My ratings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Plates you have +1 / −1 rated ({votesQ.data?.total ?? '…'}).
          </p>
        </div>
        {votesQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!votesQ.isLoading && (votesQ.data?.votes || []).length === 0 && (
          <p className="text-sm text-muted-foreground">You have not rated any plates yet.</p>
        )}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {(votesQ.data?.votes || []).map((v) => {
            const p = v.plate;
            const href = p
              ? `/plate/${encodeURIComponent(p.state)}/${encodeURIComponent(p.plate_number)}`
              : null;
            return (
              <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  {href && p ? (
                    <Link to={href} className="font-medium hover:underline">
                      {p.state} {p.plate_number}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Unknown plate</span>
                  )}
                  {v.reason_tag ? (
                    <p className="text-xs text-muted-foreground capitalize">
                      {v.reason_tag.replace(/_/g, ' ')}
                    </p>
                  ) : null}
                </div>
                <Badge variant={v.vote > 0 ? 'success' : 'destructive'}>
                  {v.vote > 0 ? '+1' : '−1'}
                </Badge>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
