import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/http';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  role: string;
  cred_score: number;
  avatar_url: string | null;
  bio: string | null;
  votes_visible?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<{ user: AuthUser }>('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 60_000,
  });

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    await queryClient.setQueryData(['auth', 'me'], null);
    await queryClient.invalidateQueries({ queryKey: ['auth'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      loading: isLoading,
      refetch,
      logout,
    }),
    [user, isLoading, refetch, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
