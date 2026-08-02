import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/http';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Helmet } from 'react-helmet-async';

export function AdminCommentsPage() {
  const { data } = useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/comments', { params: { filter: 'flagged' } });
      return data.comments as Array<{
        id: string;
        body: string;
        is_flagged: boolean;
        author?: { username: string };
        plate?: { state: string; plate_number: string };
      }>;
    },
  });

  return (
    <>
      <Helmet>
        <title>Admin comments — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-6 text-2xl font-bold">Comments</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>Body</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.author?.username}</TableCell>
                <TableCell>
                  {c.plate?.state} {c.plate?.plate_number}
                </TableCell>
                <TableCell className="max-w-md truncate">{c.body}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
