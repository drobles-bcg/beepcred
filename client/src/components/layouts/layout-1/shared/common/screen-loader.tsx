'use client';

import { BEEPCRED_LOGO_HORIZONTAL } from '@/lib/beepcred-brand';

export function ScreenLoader() {
  return (
    <div className="flex flex-col items-center gap-2 justify-center fixed inset-0 z-50 transition-opacity duration-700 ease-in-out">
      <img
        className="h-10 w-auto max-w-[220px] object-contain"
        src={BEEPCRED_LOGO_HORIZONTAL}
        alt="BeepCred"
      />
      <div className="text-muted-foreground font-medium text-sm">
        Loading...
      </div>
    </div>
  );
}
