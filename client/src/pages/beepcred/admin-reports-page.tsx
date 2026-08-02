import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Check, Eye, Flag, Trash2, X } from 'lucide-react';
import { api } from '@/api/http';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ReportContent = {
  kind?: string;
  id?: string;
  label?: string;
  href?: string | null;
  thumb?: string | null;
  meta?: string | null;
  missing?: boolean;
};

type AdminReport = {
  id: string;
  content_type: 'plate' | 'image' | 'comment' | 'user';
  content_id: string;
  reason: string;
  notes: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
  reviewed_at?: string | null;
  reporter?: { id: string; username: string; email?: string } | null;
  reviewer?: { id: string; username: string } | null;
  content?: ReportContent | null;
};

const STATUS_FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
] as const;

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'plate', label: 'Plates' },
  { id: 'image', label: 'Images' },
  { id: 'comment', label: 'Comments' },
  { id: 'user', label: 'Users' },
] as const;

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function reasonLabel(reason: string) {
  return reason.replace(/_/g, ' ');
}

function statusVariant(status: AdminReport['status']): 'secondary' | 'outline' | 'destructive' | 'success' {
  if (status === 'pending') return 'destructive';
  if (status === 'actioned') return 'success';
  if (status === 'dismissed') return 'outline';
  return 'secondary';
}

function removeActionLabel(type: AdminReport['content_type']) {
  if (type === 'image') return 'Remove photo';
  if (type === 'comment') return 'Remove comment';
  if (type === 'plate') return 'Delete plate';
  if (type === 'user') return 'Ban user';
  return 'Remove content';
}

export function AdminReportsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('pending');
  const [contentType, setContentType] = useState<string>('all');
  const [confirmRemove, setConfirmRemove] = useState<AdminReport | null>(null);
  const [actionError, setActionError] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports', status, contentType],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/reports', {
        params: {
          status: status === 'all' ? undefined : status,
          content_type: contentType === 'all' ? undefined : contentType,
          limit: 100,
        },
      });
      return data as {
        reports: AdminReport[];
        total: number;
        counts: Record<string, number>;
      };
    },
  });

  const reports = reportsQuery.data?.reports || [];
  const counts = reportsQuery.data?.counts || {};

  const resolveMutation = useMutation({
    mutationFn: async (payload: { id: string; action: string }) => {
      const { data } = await api.put(`/api/admin/reports/${payload.id}`, {
        action: payload.action,
      });
      return data;
    },
    onSuccess: async () => {
      setActionError('');
      setConfirmRemove(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
    onError: (err) => setActionError(apiErrorMessage(err, 'Action failed')),
  });

  return (
    <>
      <Helmet>
        <title>Reports — Admin — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-12 pt-2">
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Community flags for abuse, spam, or removal. Review pending reports and dismiss or take
            action on the reported plate, photo, comment, or user.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={status === f.id ? 'primary' : 'outline'}
              onClick={() => setStatus(f.id)}
            >
              {f.label}
              {typeof counts[f.id] === 'number' ? (
                <Badge variant="secondary" className="ms-1.5">
                  {counts[f.id]}
                </Badge>
              ) : null}
            </Button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={contentType === f.id ? 'secondary' : 'ghost'}
              onClick={() => setContentType(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading reports…
                  </TableCell>
                </TableRow>
              )}
              {reportsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    {apiErrorMessage(reportsQuery.error, 'Failed to load reports')}
                  </TableCell>
                </TableRow>
              )}
              {!reportsQuery.isLoading && !reportsQuery.isError && reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Flag className="mx-auto mb-2 size-6 opacity-40" />
                    No reports in this queue.
                  </TableCell>
                </TableRow>
              )}
              {reports.map((r) => {
                const content = r.content;
                const missing = content?.missing;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                          {content?.thumb ? (
                            <img src={content.thumb} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center text-[10px] uppercase text-muted-foreground">
                              {r.content_type.slice(0, 3)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="capitalize">
                              {r.content_type}
                            </Badge>
                            {missing ? (
                              <Badge variant="secondary">deleted</Badge>
                            ) : null}
                          </div>
                          {content?.href && !missing ? (
                            <Link
                              to={content.href}
                              className="line-clamp-2 text-sm font-medium hover:underline"
                            >
                              {content.label || r.content_id}
                            </Link>
                          ) : (
                            <p className="line-clamp-2 text-sm font-medium text-muted-foreground">
                              {missing ? 'Content no longer exists' : content?.label || r.content_id}
                            </p>
                          )}
                          {content?.meta ? (
                            <p className="truncate text-xs text-muted-foreground">{content.meta}</p>
                          ) : null}
                          {r.notes ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              Note: {r.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{reasonLabel(r.reason)}</TableCell>
                    <TableCell className="text-sm">
                      {r.reporter ? (
                        <Link
                          to={`/user/${encodeURIComponent(r.reporter.username)}`}
                          className="hover:underline"
                        >
                          @{r.reporter.username}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)} className="capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {content?.href && !missing ? (
                          <Button size="sm" variant="ghost" asChild title="Open">
                            <Link to={content.href}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        ) : null}
                        {r.status === 'pending' || r.status === 'reviewed' ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Mark reviewed"
                              disabled={resolveMutation.isPending}
                              onClick={() =>
                                resolveMutation.mutate({ id: r.id, action: 'mark_reviewed' })
                              }
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Dismiss"
                              disabled={resolveMutation.isPending}
                              onClick={() =>
                                resolveMutation.mutate({ id: r.id, action: 'dismiss' })
                              }
                            >
                              <X className="size-4" />
                            </Button>
                            {!missing ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                title={removeActionLabel(r.content_type)}
                                disabled={resolveMutation.isPending}
                                onClick={() => setConfirmRemove(r)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                title="Mark actioned"
                                disabled={resolveMutation.isPending}
                                onClick={() =>
                                  resolveMutation.mutate({ id: r.id, action: 'dismiss' })
                                }
                              >
                                <X className="size-4" />
                              </Button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmRemove ? removeActionLabel(confirmRemove.content_type) : 'Remove'}?</DialogTitle>
            <DialogDescription>
              This marks the report as actioned and applies the moderation step
              {confirmRemove?.content_type === 'user'
                ? ' (ban the reported account)'
                : confirmRemove?.content_type === 'plate'
                  ? ' (delete the plate and related photos/comments/votes)'
                  : confirmRemove?.content_type === 'image'
                    ? ' (delete the photo)'
                    : ' (soft-delete the comment)'}
              .
            </DialogDescription>
          </DialogHeader>
          {(actionError || resolveMutation.isError) && (
            <p className="text-sm text-destructive">
              {actionError || apiErrorMessage(resolveMutation.error, 'Failed')}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resolveMutation.isPending || !confirmRemove}
              onClick={() =>
                confirmRemove &&
                resolveMutation.mutate({ id: confirmRemove.id, action: 'remove_content' })
              }
            >
              {resolveMutation.isPending ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
