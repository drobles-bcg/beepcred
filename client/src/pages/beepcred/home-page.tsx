import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/http';
import { PlateBadge } from '@/components/beepcred/plate-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Helmet } from 'react-helmet-async';
import { credTextClass, formatCred } from '@/lib/cred-style';
import { useAuth } from '@/providers/auth-provider';

type PlateRow = {
  id: string;
  slug: string;
  state: string;
  plate_number: string;
  display_plate_text?: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  cred_score: number;
  comment_count: number;
  last_seen_at: string | null;
  primaryImage?: { thumbnail_url: string | null; image_url: string | null } | null;
};

function FeedGrid({
  isLoading,
  isError,
  data,
  sort,
}: {
  isLoading: boolean;
  isError: boolean;
  data: PlateRow[] | undefined;
  sort: string;
}) {
  if (sort !== 'recent' && sort !== 'trending' && sort !== 'controversial') return null;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (isError) {
    return (
      <p className="text-destructive">
        Couldn’t load the feed. The API on port 3010 is not reachable. From the project root run{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">npm run dev</code> (starts client and API), or in a
        second terminal start only the API: <code className="rounded bg-muted px-1 py-0.5 text-sm">cd server</code>{' '}
        then <code className="rounded bg-muted px-1 py-0.5 text-sm">npm run dev</code>.
      </p>
    );
  }
  if (!data?.length) return <p className="text-muted-foreground">No plates yet. Submit one!</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <FeedCard key={p.id} plate={p} />
      ))}
    </div>
  );
}

function FeedCard({ plate }: { plate: PlateRow }) {
  const thumb = plate.primaryImage?.thumbnail_url || plate.primaryImage?.image_url;
  const routePlate = plate.display_plate_text || plate.plate_number;
  const href = `/plate/${plate.state.toLowerCase()}/${encodeURIComponent(routePlate)}`;
  return (
    <Card className="overflow-hidden">
      <Link
        to={href}
        className="block aspect-video w-full bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover transition-opacity hover:opacity-95" />
        ) : (
          <div className="flex h-full min-h-[10rem] items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </Link>
      <CardHeader className="space-y-2 pb-2">
        <Link to={href}>
          <PlateBadge
            state={plate.state}
            plate={plate.plate_number}
            displayPlateText={plate.display_plate_text}
          />
        </Link>
        <p className="text-sm text-muted-foreground">
          {[plate.year, plate.color, plate.make, plate.model].filter(Boolean).join(' · ') || '—'}
        </p>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <div>
          <p className={`text-2xl font-semibold ${credTextClass(plate.cred_score)}`}>
            {formatCred(plate.cred_score)}
          </p>
          <p className="text-xs text-muted-foreground">{plate.comment_count} comments</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={href}>View</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  const [sort, setSort] = useState<'recent' | 'trending' | 'controversial'>('recent');
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['plates', 'feed', sort],
    queryFn: async () => {
      const { data } = await api.get<{ plates: PlateRow[] }>('/api/plates', {
        params: { sort, limit: 24 },
      });
      return data.plates;
    },
  });

  return (
    <>
      <Helmet>
        <title>BeepCred — Feed</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BeepCred</h1>
            <p className="text-muted-foreground">Community cred for drivers on the road.</p>
          </div>
          {user && (
            <div className="text-sm text-muted-foreground">
              @{user.username} · cred{' '}
              <span className={credTextClass(user.cred_score)}>{formatCred(user.cred_score)}</span>
            </div>
          )}
        </div>

        <Tabs
          value={sort}
          onValueChange={(v) => setSort(v as typeof sort)}
          className="w-full"
        >
          <TabsList className="mb-6 flex flex-wrap">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="controversial">Controversial</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="mt-0">
            <FeedGrid isLoading={isLoading} isError={isError} data={data} sort={sort} />
          </TabsContent>
          <TabsContent value="trending" className="mt-0">
            <FeedGrid isLoading={isLoading} isError={isError} data={data} sort={sort} />
          </TabsContent>
          <TabsContent value="controversial" className="mt-0">
            <FeedGrid isLoading={isLoading} isError={isError} data={data} sort={sort} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
