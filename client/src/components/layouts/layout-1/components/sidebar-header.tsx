import { ChevronFirst } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BEEPCRED_LOGO_HORIZONTAL } from '@/lib/beepcred-brand';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLayout } from './context';

export function SidebarHeader() {
  const { sidebarCollapse, setSidebarCollapse } = useLayout();

  const handleToggleClick = () => {
    setSidebarCollapse(!sidebarCollapse);
  };

  return (
    <div className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0">
      <Link to="/" className="min-w-0 shrink overflow-hidden">
        <img
          src={BEEPCRED_LOGO_HORIZONTAL}
          alt="BeepCred"
          className="default-logo h-10 w-auto max-w-[min(100%,240px)] object-contain object-left"
        />
        <img
          src={BEEPCRED_LOGO_HORIZONTAL}
          alt=""
          aria-hidden
          className="small-logo h-10 w-10 shrink-0 object-cover object-left rounded-md"
        />
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          sidebarCollapse ? 'ltr:rotate-180' : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
