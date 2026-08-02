import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PLATE_TYPES, type PlateType } from '@/lib/create-plate';
import { cn } from '@/lib/utils';

function labelFor(type: string) {
  return type.replace(/_/g, ' ');
}

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  idPrefix?: string;
};

export function PlateTypesMultiSelect({
  value,
  onChange,
  className,
  idPrefix = 'plate-type',
}: Props) {
  const selected = new Set(value);

  function toggle(type: PlateType, checked: boolean) {
    if (checked) onChange([...value, type].filter((t, i, arr) => arr.indexOf(t) === i));
    else onChange(value.filter((t) => t !== type));
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>Plate types (optional)</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PLATE_TYPES.map((type) => {
          const id = `${idPrefix}-${type}`;
          const isOn = selected.has(type);
          return (
            <label
              key={type}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm capitalize',
                isOn && 'border-foreground/30 bg-muted/60',
              )}
            >
              <Checkbox
                id={id}
                checked={isOn}
                onCheckedChange={(v) => toggle(type, v === true)}
              />
              <span>{labelFor(type)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
