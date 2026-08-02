import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '@/api/http';
import { useAuth } from '@/providers/auth-provider';

export function AccountCommentsPage() {
  const { user } = useAuth();
  const username = user?.username || '';

  const commentsQ = useQuery({
    queryKey: ['account', 'comments', username],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/comments`, {
        params: { limit: 50 },
      });
      return data as {
        comments: Array<{
          id: string;
          body: string;
          created_at?: string;
          plate?: {
            state: string;
            plate_number: string;
            display_plate_text?: string | null;
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
        <title>My comments — BeepCred</title>
      </Helmet>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My comments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Discussion you have posted ({commentsQ.data?.total ?? '…'}).
          </p>
        </div>
        {commentsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!commentsQ.isLoading && (commentsQ.data?.comments || []).length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        <ul className="space-y-3">
          {(commentsQ.data?.comments || []).map((c) => {
            const p = c.plate;
            const href = p
              ? `/plate/${encodeURIComponent(p.state)}/${encodeURIComponent(p.display_plate_text || p.plate_number)}`
              : null;
            return (
              <li key={c.id} className="rounded-xl border border-border p-4">
                {href && p ? (
                  <Link to={href} className="text-xs font-medium text-primary hover:underline">
                    {p.state} {p.display_plate_text || p.plate_number}
                  </Link>
                ) : null}
                <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
