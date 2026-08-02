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
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function AdminUsersPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users', { params: { limit: 100 } });
      return data.users as Array<{
        id: string;
        username: string;
        email: string;
        role: string;
        is_banned: boolean;
        cred_score: number;
        created_at: string;
      }>;
    },
  });

  const ban = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      await api.put(`/api/admin/users/${id}`, { is_banned: banned });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <>
      <Helmet>
        <title>Admin users — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-6 text-2xl font-bold">Users</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cred</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.cred_score}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => ban.mutate({ id: u.id, banned: !u.is_banned })}
                  >
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
