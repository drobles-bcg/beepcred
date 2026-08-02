import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/api/http';
import { AuthShell } from '@/components/beepcred/auth-shell';
import { GoogleAuthSection } from '@/components/beepcred/google-auth-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helmet } from 'react-helmet-async';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [googleError, setGoogleError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const qc = useQueryClient();

  const finishLogin = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    navigate(next, { replace: true });
  }, [navigate, next, qc]);

  const login = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/auth/login', { username, password });
      return data.user;
    },
    onSuccess: () => {
      void finishLogin();
    },
  });

  const googleLogin = useMutation({
    mutationFn: async (credential: string) => {
      const { data } = await api.post('/api/auth/google', { credential });
      return data.user;
    },
    onSuccess: () => {
      setGoogleError('');
      void finishLogin();
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as { error?: string } | undefined;
        setGoogleError(body?.error || 'Google sign-in failed');
        return;
      }
      setGoogleError('Google sign-in failed');
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

  const googleMutate = googleLogin.mutate;
  const onGoogleCredential = useCallback(
    (credential: string) => {
      googleMutate(credential);
    },
    [googleMutate]
  );

  return (
    <>
      <Helmet>
        <title>Sign in — BeepCred</title>
      </Helmet>
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardHeader className="flex-col items-start gap-1 py-5">
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Welcome back to BeepCred</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthSection
              onCredential={onGoogleCredential}
              disabled={googleLogin.isPending || login.isPending}
            />
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login.mutate();
                }}
              />
            </div>
            {(login.isError || googleError) && (
              <p className="text-sm text-destructive">{googleError || loginErrorMessage()}</p>
            )}
            <Button
              className="w-full"
              onClick={() => login.mutate()}
              disabled={login.isPending || googleLogin.isPending}
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
      </AuthShell>
    </>
  );
}
