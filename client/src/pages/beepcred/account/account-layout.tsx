import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';

type NavSection = {
  heading: string;
  items: Array<{ to: string; label: string; end?: boolean; soon?: boolean }>;
};

const SECTIONS: NavSection[] = [
  {
    heading: 'Account settings',
    items: [
      { to: '/account/profile', label: 'Edit profile', end: true },
      { to: '/account/notifications', label: 'Manage notifications' },
    ],
  },
  {
    heading: 'Spotting',
    items: [
      { to: '/account/submissions', label: 'My submissions' },
      { to: '/account/ratings', label: 'My ratings' },
      { to: '/account/following', label: 'Plates I follow', soon: true },
    ],
  },
  {
    heading: 'Garage',
    items: [
      { to: '/account/garage', label: 'Cars I own' },
    ],
  },
  {
    heading: 'Community',
    items: [
      { to: '/account/comments', label: 'My comments' },
      { to: '/account/reports', label: 'My reports' },
    ],
  },
];

export function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      <Helmet>
        <title>Account — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-12 pt-2">
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {user?.display_name || user?.username || 'Your account'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile, spotting activity, and garage.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className="mb-2 text-sm font-semibold text-foreground">{section.heading}</p>
                <nav className="flex flex-col border-s border-border">
                  {section.items.map((item) =>
                    item.soon ? (
                      <span
                        key={item.to}
                        className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground"
                      >
                        {item.label}
                        <span className="text-[10px] uppercase tracking-wide">Soon</span>
                      </span>
                    ) : (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            'border-s-2 border-transparent px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'border-primary bg-primary/5 font-medium text-primary'
                              : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ),
                  )}
                </nav>
              </div>
            ))}

            <div className="border-t border-border pt-4">
              {user?.username ? (
                <NavLink
                  to={`/user/${encodeURIComponent(user.username)}`}
                  className="mb-2 block px-3 py-2 text-sm text-foreground/80 hover:text-foreground"
                >
                  View public profile
                </NavLink>
              ) : null}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-3"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
