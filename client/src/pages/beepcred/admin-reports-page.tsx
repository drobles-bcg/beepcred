import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Helmet } from 'react-helmet-async';

export function AdminReportsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/reports');
      return data.reports as Array<{
        id: string;
        content_type: string;
        reason: string;
        status: string;
        created_at: string;
      }>;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.put(`/api/admin/reports/${id}`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  return (
    <>
      <Helmet>
        <title>Admin reports — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-6 text-2xl font-bold">Reports</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.content_type}</TableCell>
                <TableCell>{r.reason}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: 'dismissed' })}>
                    Dismiss
                  </Button>
                  <Button size="sm" onClick={() => update.mutate({ id: r.id, status: 'actioned' })}>
                    Actioned
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
