import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/http';
import { PlateBadge } from '@/components/beepcred/plate-badge';
import { ReportButton } from '@/components/beepcred/report-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Helmet } from 'react-helmet-async';
import { credTextClass, formatCred } from '@/lib/cred-style';
import { useAuth } from '@/providers/auth-provider';
import { useState } from 'react';
import { Car, Check } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
const REASONS = [
  { v: 'cool_plate', label: 'Cool plate' },
  { v: 'funny_plate', label: 'Funny plate' },
  { v: 'nice_car', label: 'Nice car' },
  { v: 'polite_driver', label: 'Polite driver' },
  { v: 'good_parker', label: 'Good parker' },
  { v: 'helpful', label: 'Helpful' },
  { v: 'bad_parking', label: 'Bad parking' },
  { v: 'speeding', label: 'Speeding' },
  { v: 'cut_off', label: 'Cut off' },
  { v: 'aggressive', label: 'Aggressive' },
  { v: 'blocking', label: 'Blocking' },
  { v: 'tailgating', label: 'Tailgating' },
  { v: 'phone_driving', label: 'Phone driving' },
  { v: 'ran_light', label: 'Ran light/sign' },
];

const COLORS = ['#17C653', '#F8285A', '#FFC700', '#99A1B7', '#6366f1'];

type GarageClaim = {
  id: string;
  ownership_status: 'current' | 'former' | string;
  make: string;
  model: string;
};

type PlateAiInsightsResponse = {
  configured: boolean;
  disabled?: boolean;
  message?: string;
  cached?: boolean;
  imageId?: string;
  generatedAt?: string;
  analysisError?: {
    code?: string;
    httpStatus?: number;
    message: string;
  };
  insights?: {
    plate?: { readText?: string; stateOrRegionGuess?: string | null; confidence?: string };
    vehicle?: {
      make?: string | null;
      model?: string | null;
      year?: number | null;
      color?: string | null;
      bodyType?: string | null;
      confidence?: string;
      notes?: string | null;
    };
    vanity?: {
      isLikelyVanityOrReference?: boolean;
      interpretation?: string;
      possibleMeanings?: string[];
      tone?: string | null;
    };
  };
};

export function PlatePage() {
  const { state = '', plate = '' } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [heroId, setHeroId] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<'newest' | 'top' | 'oldest'>('newest');
  const [commentBody, setCommentBody] = useState('');
  const [reasonTag, setReasonTag] = useState<string>('');

  const plateQuery = useQuery({
    queryKey: ['plate', state, plate],
    queryFn: async () => {
      const { data } = await api.get(`/api/plates/${encodeURIComponent(state)}/${encodeURIComponent(plate)}`);
      return data.plate as {
        id: string;
        state: string;
        plate_number: string;
        display_plate_text?: string | null;
        cred_score: number;
        plus_count: number;
        minus_count: number;
        view_count: number;
        post_count: number;
        comment_count: number;
        make: string | null;
        model: string | null;
        year: number | null;
        color: string | null;
        plate_types?: string[] | null;
        first_seen_at: string | null;
        last_seen_at: string | null;
        primary_image_id: string | null;
        primaryImage?: { id: string; image_url: string; thumbnail_url: string | null } | null;
      };
    },
  });

  const pid = plateQuery.data?.id;

  const claimQuery = useQuery({
    queryKey: ['garage', 'for-plate', pid],
    enabled: Boolean(user && pid),
    queryFn: async () => {
      const { data } = await api.get(`/api/garage/for-plate/${pid}`);
      return (data.vehicle || null) as GarageClaim | null;
    },
  });

  const claimMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/garage/claim', { plate_id: pid });
      return data.vehicle as GarageClaim;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['garage', 'for-plate', pid] });
      await qc.invalidateQueries({ queryKey: ['garage'] });
    },
  });

  const releaseMut = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { data } = await api.post(`/api/garage/${vehicleId}/release`);
      return data.vehicle as GarageClaim;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['garage', 'for-plate', pid] });
      await qc.invalidateQueries({ queryKey: ['garage'] });
    },
  });

  const imagesQuery = useQuery({
    queryKey: ['plate', pid, 'images'],
    queryFn: async () => {
      const { data } = await api.get(`/api/plates/${pid}/images`);
      return data.images as Array<{
        id: string;
        image_url: string;
        thumbnail_url: string | null;
        cred_score: number;
        uploaded_by: string;
        uploader?: { username: string };
      }>;
    },
    enabled: !!pid,
  });

  const votesQuery = useQuery({
    queryKey: ['plate', pid, 'votes'],
    queryFn: async () => {
      const { data } = await api.get(`/api/plates/${pid}/votes`);
      return data as {
        summary: {
          cred_score: number;
          plus_count: number;
          minus_count: number;
          voter_count: number;
        };
        my_vote: { vote: number; reason_tag: string | null } | null;
      };
    },
    enabled: !!pid,
  });

  const sentimentQuery = useQuery({
    queryKey: ['plate', pid, 'sentiment'],
    queryFn: async () => {
      const { data } = await api.get(`/api/plates/${pid}/sentiment`);
      return data.breakdown as Record<string, number>;
    },
    enabled: !!pid,
  });

  const commentsQuery = useQuery({
    queryKey: ['plate', pid, 'comments', commentSort],
    queryFn: async () => {
      const { data } = await api.get(`/api/plates/${pid}/comments`, {
        params: { sort: commentSort, limit: 20 },
      });
      return data.comments as Array<{
        id: string;
        body: string;
        cred_score: number;
        created_at: string;
        is_deleted: boolean;
        author?: { username: string; avatar_url: string | null };
        replies?: Array<{
          id: string;
          body: string;
          created_at: string;
          author?: { username: string };
        }>;
      }>;
    },
    enabled: !!pid,
  });

  const voteMut = useMutation({
    mutationFn: async (payload: { vote: number; reason_tag?: string | null }) => {
      await api.post(`/api/plates/${pid}/votes`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plate', pid, 'votes'] });
      qc.invalidateQueries({ queryKey: ['plate', state, plate] });
      qc.invalidateQueries({ queryKey: ['plate', pid, 'sentiment'] });
    },
  });

  const commentMut = useMutation({
    mutationFn: async () => {
      await api.post(`/api/plates/${pid}/comments`, { body: commentBody });
      setCommentBody('');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plate', pid, 'comments'] });
    },
  });

  const primary = plateQuery.data?.primaryImage;
  const images = imagesQuery.data || [];
  const hero =
    images.find((i) => i.id === (heroId || primary?.id)) || images[0] || primary;

  const aiInsightsQuery = useQuery({
    queryKey: ['plate', pid, 'ai-insights', hero?.id],
    queryFn: async () => {
      const { data } = await api.get<PlateAiInsightsResponse>(`/api/plates/${pid}/ai-insights`, {
        params: hero?.id ? { imageId: hero.id } : {},
      });
      return data;
    },
    enabled: Boolean(pid && hero?.id && hero?.image_url),
    staleTime: 1000 * 60 * 60 * 6,
  });

  const pieData = Object.entries(sentimentQuery.data || {}).map(([name, value]) => ({
    name,
    value,
  }));

  if (plateQuery.isLoading) return <p className="p-6 text-muted-foreground">Loading…</p>;
  if (plateQuery.isError || !plateQuery.data) {
    return <p className="p-6 text-destructive">Plate not found</p>;
  }

  const p = plateQuery.data;
  const totalVotes = (p.plus_count || 0) + (p.minus_count || 0);
  const plusPct = totalVotes ? Math.round((p.plus_count / totalVotes) * 100) : 50;

  return (
    <>
      <Helmet>
        <title>
          {p.state} {p.display_plate_text || p.plate_number} — BeepCred
        </title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="overflow-hidden rounded-lg border bg-muted">
              {hero?.image_url ? (
                <img src={hero.image_url} alt="" className="max-h-[480px] w-full object-contain" />
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  No photos yet
                </div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((im) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => setHeroId(im.id)}
                  className="h-16 w-24 shrink-0 overflow-hidden rounded border"
                >
                  <img
                    src={im.thumbnail_url || im.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            {hero?.id ? (
              <Card>
                <CardHeader>
                  <CardTitle>Photo insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-xs text-muted-foreground">
                    AI reads visible plate text, estimates the vehicle from the photo, and interprets vanity
                    or cultural references. Results can be wrong.
                  </p>
                  {aiInsightsQuery.isLoading && (
                    <p className="text-muted-foreground">Analyzing photo…</p>
                  )}
                  {aiInsightsQuery.isError && (
                    <p className="text-destructive">
                      Could not reach the server. Check your connection and that the API is running.
                    </p>
                  )}
                  {aiInsightsQuery.data && !aiInsightsQuery.data.configured && (
                    <p className="text-muted-foreground">
                      {aiInsightsQuery.data.disabled
                        ? 'Photo insights are turned off on this server.'
                        : aiInsightsQuery.data.message || 'Insights are not available.'}
                    </p>
                  )}
                  {aiInsightsQuery.data?.configured && aiInsightsQuery.data.analysisError && (
                    <p className="text-amber-700 dark:text-amber-500">
                      {aiInsightsQuery.data.analysisError.message}
                    </p>
                  )}
                  {aiInsightsQuery.data?.configured && aiInsightsQuery.data.insights && (
                    <>
                      {aiInsightsQuery.data.cached ? (
                        <p className="text-xs text-muted-foreground">Cached analysis (refreshes periodically)</p>
                      ) : null}
                      <div>
                        <h4 className="font-medium">Plate read</h4>
                        <p>
                          {aiInsightsQuery.data.insights.plate?.readText?.trim() || '—'}
                          {aiInsightsQuery.data.insights.plate?.stateOrRegionGuess
                            ? ` · ${aiInsightsQuery.data.insights.plate.stateOrRegionGuess}`
                            : ''}
                          {aiInsightsQuery.data.insights.plate?.confidence
                            ? ` (${aiInsightsQuery.data.insights.plate.confidence} confidence)`
                            : ''}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium">Vehicle (from photo)</h4>
                        <p>
                          {[
                            aiInsightsQuery.data.insights.vehicle?.year,
                            aiInsightsQuery.data.insights.vehicle?.color,
                            aiInsightsQuery.data.insights.vehicle?.make,
                            aiInsightsQuery.data.insights.vehicle?.model,
                            aiInsightsQuery.data.insights.vehicle?.bodyType,
                          ]
                            .filter((x) => x !== null && x !== undefined && String(x).length > 0)
                            .join(' · ') || 'Not enough detail visible'}
                        </p>
                        {aiInsightsQuery.data.insights.vehicle?.notes ? (
                          <p className="mt-1 text-muted-foreground">
                            {aiInsightsQuery.data.insights.vehicle.notes}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <h4 className="font-medium">Vanity / meaning</h4>
                        <p>{aiInsightsQuery.data.insights.vanity?.interpretation || '—'}</p>
                        {aiInsightsQuery.data.insights.vanity?.tone ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tone: {aiInsightsQuery.data.insights.vanity.tone.replace(/_/g, ' ')}
                          </p>
                        ) : null}
                        {aiInsightsQuery.data.insights.vanity?.possibleMeanings?.length ? (
                          <ul className="mt-2 list-inside list-disc text-muted-foreground">
                            {aiInsightsQuery.data.insights.vanity.possibleMeanings.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <PlateBadge
                      state={p.state}
                      plate={p.plate_number}
                      displayPlateText={p.display_plate_text}
                    />
                    <CardTitle className="text-lg">
                      {[p.year, p.color, p.make, p.model].filter(Boolean).join(' · ') || 'Vehicle details unknown'}
                    </CardTitle>
                    {Array.isArray(p.plate_types) && p.plate_types.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.plate_types.map((t) => (
                          <Badge key={t} variant="secondary" className="capitalize">
                            {t.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      First seen {p.first_seen_at ? formatDistanceToNow(new Date(p.first_seen_at), { addSuffix: true }) : '—'}{' '}
                      · Last seen{' '}
                      {p.last_seen_at ? formatDistanceToNow(new Date(p.last_seen_at), { addSuffix: true }) : '—'}
                      · {p.post_count} photos · {p.comment_count} comments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user ? (
                      claimQuery.data?.ownership_status === 'current' ? (
                        <>
                          <Button variant="secondary" size="sm" asChild>
                            <Link to={`/account/garage/${claimQuery.data.id}`}>
                              <Check className="size-4" />
                              In your garage
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={releaseMut.isPending}
                            onClick={() => releaseMut.mutate(claimQuery.data!.id)}
                          >
                            I no longer own this
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          disabled={claimMut.isPending || claimQuery.isLoading}
                          onClick={() => claimMut.mutate()}
                        >
                          <Car className="size-4" />
                          {claimQuery.data?.ownership_status === 'former'
                            ? 'I own this again'
                            : 'This is my car'}
                        </Button>
                      )
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/login">
                          <Car className="size-4" />
                          Claim as mine
                        </Link>
                      </Button>
                    )}
                    {hero?.id ? (
                      <ReportButton contentType="image" contentId={hero.id} label="Report photo" />
                    ) : null}
                    <ReportButton contentType="plate" contentId={p.id} label="Report plate" />
                  </div>
                  {(claimMut.isError || releaseMut.isError) && (
                    <p className="w-full basis-full text-sm text-destructive">
                      {axios.isAxiosError(claimMut.error)
                        ? (claimMut.error.response?.data as { error?: string } | undefined)?.error ||
                          claimMut.error.message
                        : axios.isAxiosError(releaseMut.error)
                          ? (releaseMut.error.response?.data as { error?: string } | undefined)?.error ||
                            releaseMut.error.message
                          : 'Could not update ownership'}
                    </p>
                  )}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Driver vibes</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reason tags yet</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comments</CardTitle>
                <Select
                  value={commentSort}
                  onValueChange={(v) => setCommentSort(v as typeof commentSort)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="top">Top rated</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-4">
                {user && (
                  <div className="space-y-2">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Say something about this plate…"
                    />
                    <Button onClick={() => commentMut.mutate()} disabled={commentMut.isPending}>
                      Post
                    </Button>
                  </div>
                )}
                {!user && (
                  <p className="text-sm text-muted-foreground">
                    <Link to="/login" className="text-primary underline">
                      Sign in
                    </Link>{' '}
                    to comment
                  </p>
                )}
                <div className="space-y-4">
                  {(commentsQuery.data || []).map((c) => (
                    <div key={c.id} className="border-b pb-3">
                      <div className="flex justify-between gap-2">
                        <Link
                          to={`/user/${c.author?.username || ''}`}
                          className="font-medium text-primary"
                        >
                          @{c.author?.username}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                          {!c.is_deleted ? (
                            <ReportButton contentType="comment" contentId={c.id} label="Report" />
                          ) : null}
                        </div>
                      </div>
                      <p className="text-sm">
                        {c.is_deleted ? '[comment removed]' : c.body}
                      </p>
                      {c.replies?.map((r) => (
                        <div key={r.id} className="ms-4 mt-2 border-s-2 ps-3 text-sm">
                          <span className="font-medium">@{r.author?.username}</span> {r.body}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cred</CardTitle>
                <p className={`text-4xl font-bold ${credTextClass(p.cred_score)}`}>
                  {formatCred(p.cred_score)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {votesQuery.data?.summary.voter_count ?? 0} people rated
                </p>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-[#17C653]"
                    style={{ width: `${plusPct}%` }}
                  />
                  <div className="bg-[#F8285A]" style={{ width: `${100 - plusPct}%` }} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={votesQuery.data?.my_vote?.vote === 1 ? 'default' : 'outline'}
                    className="flex-1 bg-[#17C653] text-white hover:bg-[#17C653]/90"
                    disabled={!user}
                    onClick={() =>
                      user &&
                      voteMut.mutate({
                        vote: votesQuery.data?.my_vote?.vote === 1 ? 0 : 1,
                        reason_tag: reasonTag || undefined,
                      })
                    }
                  >
                    +1
                  </Button>
                  <Button
                    variant={votesQuery.data?.my_vote?.vote === -1 ? 'destructive' : 'outline'}
                    className="flex-1"
                    disabled={!user}
                    onClick={() =>
                      user &&
                      voteMut.mutate({
                        vote: votesQuery.data?.my_vote?.vote === -1 ? 0 : -1,
                        reason_tag: reasonTag || undefined,
                      })
                    }
                  >
                    -1
                  </Button>
                </div>
                <Select value={reasonTag} onValueChange={setReasonTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Reason (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.v} value={r.v}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!user && (
                  <p className="text-xs text-muted-foreground">
                    <Link to="/login" className="underline">
                      Sign in
                    </Link>{' '}
                    to vote
                  </p>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/submit">Submit another photo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
