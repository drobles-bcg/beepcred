import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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

export function AdminPlatesPage() {
  const { data } = useQuery({
    queryKey: ['admin', 'plates'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/plates', { params: { limit: 100 } });
      return data.plates as Array<{
        id: string;
        state: string;
        plate_number: string;
        display_plate_text?: string | null;
        cred_score: number;
        post_count: number;
      }>;
    },
  });

  return (
    <>
      <Helmet>
        <title>Admin plates — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-6 text-2xl font-bold">Plates</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Cred</TableHead>
              <TableHead>Posts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    to={`/plate/${p.state.toLowerCase()}/${encodeURIComponent(
                      p.display_plate_text || p.plate_number
                    )}`}
                    className="text-primary underline"
                  >
                    {p.state} {p.display_plate_text || p.plate_number}
                  </Link>
                </TableCell>
                <TableCell>{p.cred_score}</TableCell>
                <TableCell>{p.post_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
