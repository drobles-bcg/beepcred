import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [display_name, setDisplayName] = useState('');
  const [googleError, setGoogleError] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const finish = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    navigate('/', { replace: true });
  }, [navigate, qc]);

  const reg = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/auth/register', {
        username,
        email,
        password,
        display_name: display_name || username,
      });
      return data.user;
    },
    onSuccess: () => {
      void finish();
    },
  });

  const googleLogin = useMutation({
    mutationFn: async (credential: string) => {
      const { data } = await api.post('/api/auth/google', { credential });
      return data.user;
    },
    onSuccess: () => {
      setGoogleError('');
      void finish();
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
        <title>Register — BeepCred</title>
      </Helmet>
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardHeader className="flex-col items-start gap-1 py-5">
            <CardTitle>Create account</CardTitle>
            <CardDescription>Join the road reputation community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthSection
              onCredential={onGoogleCredential}
              disabled={googleLogin.isPending || reg.isPending}
              label="Continue with Google"
            />
            <div className="space-y-2">
              <Label htmlFor="u">Username</Label>
              <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e">Email</Label>
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d">Display name</Label>
              <Input id="d" value={display_name} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Password</Label>
              <Input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {(reg.isError || googleError) && (
              <p className="text-sm text-destructive">
                {googleError || 'Could not register (username/email taken?)'}
              </p>
            )}
            <Button
              className="w-full"
              onClick={() => reg.mutate()}
              disabled={reg.isPending || googleLogin.isPending}
            >
              {reg.isPending ? 'Creating…' : 'Register'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    </>
  );
}
