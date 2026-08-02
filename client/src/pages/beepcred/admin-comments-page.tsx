import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Flag, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/http';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type AdminComment = {
  id: string;
  body: string;
  plate_id: string;
  user_id: string;
  parent_id: string | null;
  cred_score: number;
  is_deleted: boolean;
  is_flagged: boolean;
  created_at?: string;
  createdAt?: string;
  author?: {
    id: string;
    username: string;
    email?: string;
    display_name?: string | null;
  } | null;
  plate?: {
    id: string;
    slug: string;
    state: string;
    plate_number: string;
    display_plate_text?: string | null;
  } | null;
};

type PlateOption = {
  id: string;
  state: string;
  plate_number: string;
  display_plate_text?: string | null;
  slug: string;
};

const FILTERS = [
  { id: 'flagged', label: 'Flagged' },
  { id: 'active', label: 'Active' },
  { id: 'deleted', label: 'Deleted' },
  { id: 'all', label: 'All' },
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

function plateHref(plate: AdminComment['plate']) {
  if (!plate) return null;
  return `/plate/${encodeURIComponent(plate.state)}/${encodeURIComponent(plate.plate_number)}`;
}

function plateLabel(plate: AdminComment['plate'] | PlateOption | null | undefined) {
  if (!plate) return 'Unknown plate';
  return `${plate.state} ${plate.display_plate_text || plate.plate_number}`;
}

export function AdminCommentsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('flagged');
  const [q, setQ] = useState('');
  const [editTarget, setEditTarget] = useState<AdminComment | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editFlagged, setEditFlagged] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBody, setCreateBody] = useState('');
  const [plateSearch, setPlateSearch] = useState('');
  const [selectedPlate, setSelectedPlate] = useState<PlateOption | null>(null);

  const commentsQuery = useQuery({
    queryKey: ['admin', 'comments', filter, q],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/comments', {
        params: {
          filter,
          q: q || undefined,
          limit: 100,
        },
      });
      return data as {
        comments: AdminComment[];
        total: number;
        counts: Record<string, number>;
      };
    },
  });

  const platesQuery = useQuery({
    queryKey: ['admin', 'plates', 'comment-create', plateSearch],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/plates', {
        params: { q: plateSearch || undefined, limit: 20 },
      });
      return (data.plates || []) as PlateOption[];
    },
    enabled: createOpen,
  });

  const comments = commentsQuery.data?.comments || [];
  const counts = commentsQuery.data?.counts || {};
  const total = commentsQuery.data?.total ?? comments.length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) throw new Error('No comment selected');
      const { data } = await api.put(`/api/admin/comments/${editTarget.id}`, {
        body: editBody,
        is_flagged: editFlagged,
      });
      return data.comment as AdminComment;
    },
    onSuccess: async () => {
      setFormError('');
      setEditTarget(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not save comment')),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlate) throw new Error('Pick a plate');
      if (!createBody.trim()) throw new Error('Comment body required');
      const { data } = await api.post('/api/admin/comments', {
        plate_id: selectedPlate.id,
        body: createBody.trim(),
      });
      return data.comment as AdminComment;
    },
    onSuccess: async () => {
      setFormError('');
      setCreateOpen(false);
      setCreateBody('');
      setSelectedPlate(null);
      setPlateSearch('');
      setFilter('active');
      await qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not create comment')),
  });

  const softActionMutation = useMutation({
    mutationFn: async (payload: { id: string; is_deleted?: boolean; is_flagged?: boolean }) => {
      const { data } = await api.put(`/api/admin/comments/${payload.id}`, {
        is_deleted: payload.is_deleted,
        is_flagged: payload.is_flagged,
      });
      return data.comment as AdminComment;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { id: string; hard: boolean }) => {
      await api.delete(`/api/admin/comments/${payload.id}`, {
        params: payload.hard ? { hard: '1' } : undefined,
      });
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setHardDelete(false);
      await qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
  });

  function openEdit(c: AdminComment) {
    setEditTarget(c);
    setEditBody(c.body || '');
    setEditFlagged(!!c.is_flagged);
    setFormError('');
  }

  function openCreate() {
    setCreateOpen(true);
    setCreateBody('');
    setSelectedPlate(null);
    setPlateSearch('');
    setFormError('');
  }

  return (
    <>
      <Helmet>
        <title>Comments — Admin — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-12 pt-2">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Comments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review, edit, flag, and remove discussion. {total} shown in this filter.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add comment
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? 'primary' : 'outline'}
              onClick={() => setFilter(f.id)}
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

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-8"
              placeholder="Search comment text…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comment</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commentsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading comments…
                  </TableCell>
                </TableRow>
              )}
              {commentsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    {apiErrorMessage(commentsQuery.error, 'Failed to load comments')}
                  </TableCell>
                </TableRow>
              )}
              {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No comments in this filter.
                  </TableCell>
                </TableRow>
              )}
              {comments.map((c) => {
                const href = plateHref(c.plate);
                return (
                  <TableRow key={c.id} className={c.is_deleted ? 'opacity-60' : undefined}>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-3 text-sm whitespace-pre-wrap">{c.body}</p>
                      {c.parent_id ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">Reply</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {href ? (
                        <Link to={href} className="font-medium hover:underline">
                          {plateLabel(c.plate)}
                        </Link>
                      ) : (
                        plateLabel(c.plate)
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.author ? (
                        <Link
                          to={`/user/${encodeURIComponent(c.author.username)}`}
                          className="hover:underline"
                        >
                          @{c.author.username}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.is_flagged ? (
                          <Badge variant="destructive">Flagged</Badge>
                        ) : (
                          <Badge variant="outline">Clear</Badge>
                        )}
                        {c.is_deleted ? <Badge variant="secondary">Deleted</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(c.created_at || c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(c)}>
                          <Pencil className="size-4" />
                        </Button>
                        {c.is_flagged ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Clear flag"
                            disabled={softActionMutation.isPending}
                            onClick={() =>
                              softActionMutation.mutate({ id: c.id, is_flagged: false })
                            }
                          >
                            <Flag className="size-4 opacity-40" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Flag"
                            disabled={softActionMutation.isPending}
                            onClick={() =>
                              softActionMutation.mutate({ id: c.id, is_flagged: true })
                            }
                          >
                            <Flag className="size-4" />
                          </Button>
                        )}
                        {c.is_deleted ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Restore"
                            disabled={softActionMutation.isPending}
                            onClick={() =>
                              softActionMutation.mutate({ id: c.id, is_deleted: false })
                            }
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            title="Remove"
                            onClick={() => {
                              setHardDelete(false);
                              setDeleteTarget(c);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit comment</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `${plateLabel(editTarget.plate)} · @${editTarget.author?.username || 'unknown'}`
                : 'Update comment text and moderation flags.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="comment-body">Body</Label>
              <Textarea
                id="comment-body"
                rows={5}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editFlagged}
                onChange={(e) => setEditFlagged(e.target.checked)}
              />
              Flagged for review
            </label>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !editBody.trim()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setFormError('');
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add comment</DialogTitle>
            <DialogDescription>
              Post a comment as your admin account on an existing plate.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="plate-search">Plate</Label>
              <Input
                id="plate-search"
                placeholder="Search plate number, make…"
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {(platesQuery.data || []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`flex w-full px-3 py-2 text-start text-sm hover:bg-muted ${
                      selectedPlate?.id === p.id ? 'bg-muted font-medium' : ''
                    }`}
                    onClick={() => setSelectedPlate(p)}
                  >
                    {plateLabel(p)}
                    <span className="ms-2 text-xs text-muted-foreground">{p.slug}</span>
                  </button>
                ))}
                {createOpen && !platesQuery.isLoading && (platesQuery.data || []).length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No plates found.</p>
                ) : null}
              </div>
              {selectedPlate ? (
                <p className="text-xs text-muted-foreground">Selected: {plateLabel(selectedPlate)}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-body">Comment</Label>
              <Textarea
                id="create-body"
                rows={4}
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                placeholder="Write the comment…"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !selectedPlate || !createBody.trim()}
            >
              {createMutation.isPending ? 'Posting…' : 'Post comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setHardDelete(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{hardDelete ? 'Permanently delete?' : 'Remove comment?'}</DialogTitle>
            <DialogDescription>
              {hardDelete
                ? 'This permanently deletes the comment (and direct replies) from the database.'
                : 'Soft-deletes the comment and flags it. You can restore it later from the Deleted filter.'}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hardDelete}
              onChange={(e) => setHardDelete(e.target.checked)}
            />
            Permanently delete (cannot undo)
          </label>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              {apiErrorMessage(deleteMutation.error, 'Delete failed')}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() =>
                deleteTarget &&
                deleteMutation.mutate({ id: deleteTarget.id, hard: hardDelete })
              }
            >
              {deleteMutation.isPending ? 'Working…' : hardDelete ? 'Delete forever' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
