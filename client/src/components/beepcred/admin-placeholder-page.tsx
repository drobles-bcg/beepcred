import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/plates', label: 'Plates' },
  { to: '/admin/images', label: 'Images' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/comments', label: 'Comments' },
];

type AdminPlaceholderPageProps = {
  title: string;
  description?: string;
};

export function AdminPlaceholderPage({
  title,
  description = 'This admin section is a placeholder. Functionality will be added here.',
}: AdminPlaceholderPageProps) {
  return (
    <>
      <Helmet>
        <title>{title} — Admin — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-4xl px-4 pb-12 pt-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="mb-3 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mb-8 max-w-2xl text-muted-foreground">{description}</p>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Wire data tables, moderation actions, and ops tools into this page.
          </p>
        </div>
        <nav className="mt-8 flex flex-wrap gap-3 text-sm">
          {ADMIN_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-primary underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
