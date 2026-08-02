import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/http';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helmet } from 'react-helmet-async';
import { PlateBadge } from '@/components/beepcred/plate-badge';

export function SearchPage() {
  const [q, setQ] = useState('');

  const platesQ = useQuery({
    queryKey: ['search', 'plates', q],
    queryFn: async () => {
      const { data } = await api.get('/api/search/plates', { params: { q } });
      return data.plates as Array<{
        id: string;
        state: string;
        plate_number: string;
        display_plate_text?: string | null;
        make: string | null;
        model: string | null;
      }>;
    },
    enabled: q.length >= 2,
  });

  const usersQ = useQuery({
    queryKey: ['search', 'users', q],
    queryFn: async () => {
      const { data } = await api.get('/api/search/users', { params: { q } });
      return data.users as Array<{ id: string; username: string; display_name: string | null }>;
    },
    enabled: q.length >= 2,
  });

  return (
    <>
      <Helmet>
        <title>Search — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-3xl px-4 pb-10">
        <h1 className="mb-4 text-2xl font-bold">Search</h1>
        <div className="mb-6 flex gap-2">
          <Input
            placeholder="Plate, make, model, or username…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="button" variant="secondary">
            Search
          </Button>
        </div>

        {q.length >= 2 && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(platesQ.data || []).map((p) => (
                  <Link
                    key={p.id}
                    to={`/plate/${p.state.toLowerCase()}/${encodeURIComponent(
                      p.display_plate_text || p.plate_number
                    )}`}
                    className="block"
                  >
                    <PlateBadge
                      state={p.state}
                      plate={p.plate_number}
                      displayPlateText={p.display_plate_text}
                    />
                    <p className="text-xs text-muted-foreground">
                      {[p.make, p.model].filter(Boolean).join(' ') || '—'}
                    </p>
                  </Link>
                ))}
                {platesQ.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No plates</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(usersQ.data || []).map((u) => (
                  <Link key={u.id} to={`/user/${u.username}`} className="block font-medium text-primary">
                    @{u.username}
                    <span className="block text-xs text-muted-foreground">{u.display_name}</span>
                  </Link>
                ))}
                {usersQ.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No users</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
