import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { api } from '@/api/http';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export function AccountNotificationsPage() {
  const { user, refetch } = useAuth();
  const qc = useQueryClient();
  const [votesVisible, setVotesVisible] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setVotesVisible(user?.votes_visible !== false);
  }, [user]);

  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const { data } = await api.put('/api/users/me', { votes_visible: next });
      return data.user;
    },
    onSuccess: async () => {
      setError('');
      setMessage('Preferences saved.');
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      refetch();
    },
    onError: (err) => {
      setMessage('');
      setError(apiErrorMessage(err, 'Could not save preferences'));
    },
  });

  return (
    <>
      <Helmet>
        <title>Notifications — BeepCred</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Manage notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Control what others can see and what we send you. Email alerts are coming soon.
          </p>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="votes-visible" className="text-sm font-medium">
                Show my ratings publicly
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                When off, only you can see plates you have rated.
              </p>
            </div>
            <Switch
              id="votes-visible"
              checked={votesVisible}
              onCheckedChange={(checked) => {
                setVotesVisible(checked);
                save.mutate(checked);
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Email digests for new comments on your submissions and report outcomes — soon.
        </div>

        {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {save.isPending ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
        <Button variant="outline" disabled>
          Email alerts (soon)
        </Button>
      </div>
    </>
  );
}
