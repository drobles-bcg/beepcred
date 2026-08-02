import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';

export function AdminImagesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'images'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/images', { params: { limit: 48 } });
      return data.images as Array<{
        id: string;
        image_url: string;
        thumbnail_url: string | null;
        is_approved: boolean;
        plate?: { state: string; plate_number: string; display_plate_text?: string | null };
      }>;
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/api/admin/images/${id}`, { is_approved: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'images'] }),
  });

  return (
    <>
      <Helmet>
        <title>Admin images — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-6 text-2xl font-bold">Image moderation</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(data || []).map((im) => (
            <div key={im.id} className="overflow-hidden rounded-lg border">
              {im.plate ? (
                <Link
                  to={`/plate/${im.plate.state.toLowerCase()}/${encodeURIComponent(
                    im.plate.display_plate_text || im.plate.plate_number,
                  )}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={im.thumbnail_url || im.image_url}
                    alt=""
                    className="aspect-video w-full object-cover transition-opacity hover:opacity-95"
                  />
                </Link>
              ) : (
                <img
                  src={im.thumbnail_url || im.image_url}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="p-2 text-xs">
                <p>
                  {im.plate?.state} {im.plate?.plate_number}
                </p>
                <Button size="sm" className="mt-1 w-full" onClick={() => approve.mutate(im.id)}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
