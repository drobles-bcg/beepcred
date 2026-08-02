import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { api } from '@/api/http';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export function AccountProfilePage() {
  const { user, refetch } = useAuth();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayName(user?.display_name || '');
    setBio(user?.bio || '');
  }, [user]);

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/api/users/me', {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      return data.user;
    },
    onSuccess: async () => {
      setError('');
      setMessage('Profile saved.');
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      refetch();
    },
    onError: (err) => {
      setMessage('');
      setError(apiErrorMessage(err, 'Could not save profile'));
    },
  });

  const avatar = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/api/users/me/avatar', fd, {
        headers: { 'Content-Type': undefined as unknown as string },
      });
      return data as { avatar_url: string };
    },
    onSuccess: async () => {
      setError('');
      setMessage('Avatar updated.');
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      refetch();
    },
    onError: (err) => {
      setMessage('');
      setError(apiErrorMessage(err, 'Could not upload avatar'));
    },
  });

  return (
    <>
      <Helmet>
        <title>Edit profile — BeepCred</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Edit profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How you appear on plates, comments, and your public profile.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback>
              {(user?.username || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <Label htmlFor="avatar-file">Photo</Label>
            <Input
              id="avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatar.mutate(file);
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={user?.username || ''} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional display name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short intro for your public profile"
          />
        </div>

        {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </>
  );
}
