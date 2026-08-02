import { Link } from 'react-router-dom';

const linkClass = 'hover:text-primary';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer border-t border-border/60">
      <div className="container">
        <div className="flex flex-col items-center justify-center gap-3 py-5 md:flex-row md:justify-between">
          <div className="order-2 flex gap-2 text-sm font-normal md:order-1">
            <span className="text-muted-foreground">
              {currentYear} &copy; BeepCred
            </span>
          </div>
          <nav className="order-1 flex flex-wrap items-center justify-center gap-4 text-sm font-normal text-muted-foreground md:order-2">
            <Link to="/docs" className={linkClass}>
              Docs
            </Link>
            <Link to="/purchase" className={linkClass}>
              Purchase
            </Link>
            <Link to="/faq" className={linkClass}>
              FAQ
            </Link>
            <Link to="/support" className={linkClass}>
              Support
            </Link>
            <Link to="/license" className={linkClass}>
              License
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
