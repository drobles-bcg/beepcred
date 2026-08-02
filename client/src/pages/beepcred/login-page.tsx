import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helmet } from 'react-helmet-async';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const qc = useQueryClient();

  const login = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/auth/login', { username, password });
      return data.user;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate(next, { replace: true });
    },
  });

  function loginErrorMessage(): string {
    const err = login.error;
    if (!err) return '';
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const body = err.response?.data as { error?: string } | undefined;
      const msg = body?.error || err.message;
      if (status === 401) return 'Invalid username or password';
      if (msg?.includes('SQLITE_READONLY') || msg?.includes('readonly database')) {
        return 'Server cannot write the database (check file permissions on server/db/*.sqlite).';
      }
      return msg || 'Sign-in failed';
    }
    return err instanceof Error ? err.message : 'Sign-in failed';
  }

  return (
    <>
      <Helmet>
        <title>Sign in — BeepCred</title>
      </Helmet>
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Welcome back to BeepCred</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Username</Label>
              <Input
                id="user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Password</Label>
              <Input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {login.isError && (
              <p className="text-sm text-destructive">{loginErrorMessage()}</p>
            )}
            <Button
              className="w-full"
              onClick={() => login.mutate()}
              disabled={login.isPending}
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account?{' '}
              <Link to="/register" className="text-primary underline">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
