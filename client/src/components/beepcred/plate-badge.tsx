import { cn } from '@/lib/utils';

type Props = {
  state: string;
  plate: string;
  displayPlateText?: string | null;
  className?: string;
};

export function PlateBadge({ state, plate, displayPlateText, className }: Props) {
  const shown = displayPlateText?.trim() || plate;
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center rounded-md border-2 border-[#FFC700]/80 bg-zinc-900 px-3 py-1.5 text-white shadow-inner',
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#FFC700]">
        {state}
      </span>
      <span className="font-mono text-lg font-bold tracking-[0.2em]">{shown}</span>
    </div>
  );
}
