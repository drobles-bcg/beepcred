import { useAuth } from '@/providers/auth-provider';
import { HomePage } from '@/pages/beepcred/home-page';
import { LandingPage } from '@/pages/beepcred/landing-page';

/** Logged-out users see the marketing landing page; logged-in users see the feed. */
export function HomeGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">Loading…</div>
    );
  }

  if (!user) return <LandingPage />;
  return <HomePage />;
}
