import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '@/api/http';
import { Badge } from '@/components/ui/badge';

export function AccountReportsPage() {
  const reportsQ = useQuery({
    queryKey: ['account', 'reports'],
    queryFn: async () => {
      const { data } = await api.get('/api/reports/mine', { params: { limit: 50 } });
      return data as {
        reports: Array<{
          id: string;
          content_type: string;
          reason: string;
          notes: string | null;
          status: string;
          created_at?: string;
        }>;
        total: number;
      };
    },
  });

  return (
    <>
      <Helmet>
        <title>My reports — BeepCred</title>
      </Helmet>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Flags you filed for abuse or removal ({reportsQ.data?.total ?? '…'}). Moderators review
            these in the admin queue.
          </p>
        </div>
        {reportsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!reportsQ.isLoading && (reportsQ.data?.reports || []).length === 0 && (
          <p className="text-sm text-muted-foreground">You have not filed any reports yet.</p>
        )}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {(reportsQ.data?.reports || []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {r.content_type}
                  </Badge>
                  <span className="capitalize">{r.reason.replace(/_/g, ' ')}</span>
                </div>
                {r.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.notes}</p>
                ) : null}
                {r.created_at ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <Badge
                variant={
                  r.status === 'pending'
                    ? 'destructive'
                    : r.status === 'actioned'
                      ? 'success'
                      : 'secondary'
                }
                className="capitalize"
              >
                {r.status}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
