import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/http';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Helmet } from 'react-helmet-async';
import { credTextClass, formatCred } from '@/lib/cred-style';

export function UserProfilePage() {
  const { username = '' } = useParams();

  const userQ = useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${encodeURIComponent(username)}`);
      return data.user as {
        id: string;
        username: string;
        display_name: string | null;
        bio: string | null;
        avatar_url: string | null;
        cred_score: number;
        post_count: number;
        comment_count: number;
        created_at: string;
      };
    },
  });

  const subQ = useQuery({
    queryKey: ['user', username, 'submissions'],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/submissions`);
      return data.images as Array<{
        id: string;
        thumbnail_url: string | null;
        image_url: string;
        plate?: { state: string; plate_number: string; display_plate_text?: string | null };
      }>;
    },
    enabled: !!userQ.data,
  });

  const commentsQ = useQuery({
    queryKey: ['user', username, 'comments'],
    queryFn: async () => {
      const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/comments`);
      return data.comments as Array<{
        id: string;
        body: string;
        plate?: { state: string; plate_number: string; display_plate_text?: string | null };
      }>;
    },
    enabled: !!userQ.data,
  });

  if (userQ.isLoading) return <p className="p-6">Loading…</p>;
  if (userQ.isError || !userQ.data) return <p className="p-6">User not found</p>;

  const u = userQ.data;

  return (
    <>
      <Helmet>
        <title>@{u.username} — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-4xl px-4 pb-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={u.avatar_url || undefined} />
            <AvatarFallback>{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{u.display_name || u.username}</h1>
            <p className="text-muted-foreground">@{u.username}</p>
            <p className={`mt-1 text-lg font-semibold ${credTextClass(u.cred_score)}`}>
              Cred {formatCred(u.cred_score)}
            </p>
            <p className="text-sm text-muted-foreground">
              {u.post_count} posts · {u.comment_count} comments
            </p>
            {u.bio && <p className="mt-2 max-w-lg text-sm">{u.bio}</p>}
          </div>
        </div>

        <Tabs defaultValue="submissions">
          <TabsList>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(subQ.data || []).map((im) => {
                const p = im.plate;
                const href = p
                  ? `/plate/${p.state.toLowerCase()}/${encodeURIComponent(p.display_plate_text || p.plate_number)}`
                  : null;
                const img = (
                  <img
                    src={im.thumbnail_url || im.image_url}
                    alt=""
                    className="aspect-video w-full rounded-md object-cover transition-opacity hover:opacity-95"
                  />
                );
                return href ? (
                  <Link key={im.id} to={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                    {img}
                  </Link>
                ) : (
                  <div key={im.id}>{img}</div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="comments">
            {commentsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!commentsQ.isLoading && (commentsQ.data || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            <ul className="space-y-3">
              {(commentsQ.data || []).map((c) => {
                const p = c.plate;
                const href = p
                  ? `/plate/${encodeURIComponent(p.state)}/${encodeURIComponent(p.display_plate_text || p.plate_number)}`
                  : null;
                return (
                  <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                    {href && p ? (
                      <Link to={href} className="text-xs font-medium text-primary hover:underline">
                        {p.state} {p.display_plate_text || p.plate_number}
                      </Link>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                  </li>
                );
              })}
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
