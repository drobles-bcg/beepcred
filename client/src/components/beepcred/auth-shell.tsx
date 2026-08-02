import { Link } from 'react-router-dom';

type AuthShellProps = {
  children: React.ReactNode;
};

/** Full-viewport centered auth layout (login/register sit outside Layout1). */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <header className="flex w-full shrink-0 items-center justify-center border-b border-border px-4 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight text-foreground no-underline">
          BeepCred
        </Link>
      </header>
      <main className="flex w-full flex-1 items-center justify-center p-4">{children}</main>
    </div>
  );
}
