import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/http';
import { canAccessAdmin, OWNER_ADMIN_EMAIL } from '@/lib/admin-access';
import { useAuth } from '@/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type AdminUser = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  is_banned: boolean;
  cred_score: number;
  post_count?: number;
  comment_count?: number;
  google_id?: string | null;
  votes_visible?: boolean;
  last_active_at: string | null;
  created_at: string;
};

type UserFormState = {
  username: string;
  email: string;
  display_name: string;
  bio: string;
  role: AdminUser['role'];
  is_banned: boolean;
  password: string;
};

const emptyForm = (): UserFormState => ({
  username: '',
  email: '',
  display_name: '',
  bio: '',
  role: 'user',
  is_banned: false,
  password: '',
});

function formFromUser(u: AdminUser): UserFormState {
  return {
    username: u.username || '',
    email: u.email || '',
    display_name: u.display_name || '',
    bio: u.bio || '',
    role: u.role,
    is_banned: !!u.is_banned,
    password: '',
  };
}

function initials(u: Pick<AdminUser, 'display_name' | 'username'>) {
  const src = (u.display_name || u.username || '?').trim();
  return src.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', q, roleFilter, bannedFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users', {
        params: {
          limit: 100,
          q: q || undefined,
          role: roleFilter || undefined,
          banned: bannedFilter || undefined,
        },
      });
      return data as { users: AdminUser[]; total: number };
    },
  });

  const users = usersQuery.data?.users || [];
  const total = usersQuery.data?.total ?? users.length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const payload: Record<string, unknown> = {
          username: form.username,
          email: form.email,
          display_name: form.display_name,
          bio: form.bio,
          role: form.role,
          is_banned: form.is_banned,
        };
        if (form.password.trim()) payload.password = form.password;
        const { data } = await api.put(`/api/admin/users/${editing.id}`, payload);
        return data.user as AdminUser;
      }
      const { data } = await api.post('/api/admin/users', {
        username: form.username,
        email: form.email,
        password: form.password,
        display_name: form.display_name || form.username,
        bio: form.bio || null,
        role: form.role,
        is_banned: form.is_banned,
      });
      return data.user as AdminUser;
    },
    onSuccess: async () => {
      setFormError('');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not save user')),
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, is_banned }: { id: string; is_banned: boolean }) => {
      const { data } = await api.put(`/api/admin/users/${id}`, { is_banned });
      return data.user as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/users/${id}`);
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const editingIsOwner = useMemo(
    () => !!editing && canAccessAdmin(editing),
    [editing]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm(formFromUser(u));
    setFormError('');
    setDialogOpen(true);
  }

  return (
    <>
      <Helmet>
        <title>Users — Admin — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-12 pt-2">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} account{total === 1 ? '' : 's'} in the database
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add user
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-8"
              placeholder="Search username, email, display name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={bannedFilter}
            onChange={(e) => setBannedFilter(e.target.value)}
          >
            <option value="">All status</option>
            <option value="false">Active</option>
            <option value="true">Banned</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cred</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              )}
              {usersQuery.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    {apiErrorMessage(usersQuery.error, 'Failed to load users')}
                  </TableCell>
                </TableRow>
              )}
              {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => {
                const owner = canAccessAdmin(u);
                const isSelf = me?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          {u.avatar_url ? <AvatarImage src={u.avatar_url} alt="" /> : null}
                          <AvatarFallback>{initials(u)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/user/${encodeURIComponent(u.username)}`}
                              className="truncate font-medium text-foreground hover:underline"
                            >
                              {u.display_name || u.username}
                            </Link>
                            {owner && <Badge variant="secondary">Owner</Badge>}
                            {u.google_id && <Badge variant="outline">Google</Badge>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            @{u.username} · {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>
                      {u.is_banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{u.cred_score}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(u.last_active_at || u.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Edit">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={owner || banMutation.isPending}
                          onClick={() => banMutation.mutate({ id: u.id, is_banned: !u.is_banned })}
                          title={u.is_banned ? 'Unban' : 'Ban'}
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={owner || isSelf || deleteMutation.isPending}
                          onClick={() => setDeleteTarget(u)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit user' : 'Create user'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update profile for @${editing.username}`
                : 'Create a new account in the BeepCred database.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-username">Username</Label>
                <Input
                  id="admin-username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={form.email}
                  disabled={editingIsOwner}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                {editingIsOwner && (
                  <p className="text-xs text-muted-foreground">Owner email is locked ({OWNER_ADMIN_EMAIL}).</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-display">Display name</Label>
              <Input
                id="admin-display"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-bio">Bio</Label>
              <Textarea
                id="admin-bio"
                value={form.bio}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-role">Role</Label>
                <select
                  id="admin-role"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.role}
                  disabled={editingIsOwner}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as AdminUser['role'] }))
                  }
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">
                  {editing ? 'New password (optional)' : 'Password'}
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_banned}
                disabled={editingIsOwner}
                onChange={(e) => setForm((f) => ({ ...f, is_banned: e.target.checked }))}
              />
              Banned
            </label>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                !form.username.trim() ||
                !form.email.trim() ||
                (!editing && !form.password.trim())
              }
            >
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This permanently removes @{deleteTarget?.username} from the database. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
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
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
