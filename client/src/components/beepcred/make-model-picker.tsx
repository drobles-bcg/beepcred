import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  modelsForMake,
  resolveMake,
  searchMakes,
  searchModels,
} from '@/lib/vehicle-catalog';
import { cn } from '@/lib/utils';

type Props = {
  make: string;
  model: string;
  onChange: (next: { make: string; model: string }) => void;
  className?: string;
  idPrefix?: string;
};

export function MakeModelPicker({
  make,
  model,
  onChange,
  className,
  idPrefix = 'vehicle',
}: Props) {
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [makeQuery, setMakeQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');

  const resolvedMake = resolveMake(make);
  const makeOptions = useMemo(() => searchMakes(makeQuery), [makeQuery]);
  const modelOptions = useMemo(
    () => searchModels(modelQuery, resolvedMake || make || null),
    [modelQuery, resolvedMake, make],
  );

  function selectMake(nextMake: string) {
    const models = modelsForMake(nextMake);
    const keepModel = model && models.some((m) => m === model) ? model : '';
    onChange({ make: nextMake, model: keepModel });
    setMakeOpen(false);
    setMakeQuery('');
  }

  function selectModel(nextMake: string, nextModel: string) {
    onChange({ make: nextMake, model: nextModel });
    setModelOpen(false);
    setModelQuery('');
  }

  function clearMake() {
    onChange({ make: '', model: '' });
  }

  function clearModel() {
    onChange({ make, model: '' });
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-make`}>Make</Label>
        <div className="flex gap-1">
          <Popover open={makeOpen} onOpenChange={setMakeOpen}>
            <PopoverTrigger asChild>
              <Button
                id={`${idPrefix}-make`}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={makeOpen}
                className="w-full justify-between font-normal"
              >
                <span className={cn('truncate', !make && 'text-muted-foreground')}>
                  {make || 'Search make…'}
                </span>
                <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search makes…"
                  value={makeQuery}
                  onValueChange={setMakeQuery}
                />
                <CommandList>
                  <CommandEmpty>No make found.</CommandEmpty>
                  <CommandGroup>
                    {makeOptions.map((m) => (
                      <CommandItem key={m} value={m} onSelect={() => selectMake(m)}>
                        <Check
                          className={cn(
                            'me-2 size-4',
                            resolveMake(make) === m ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {m}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {make ? (
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={clearMake} title="Clear make">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-model`}>Model</Label>
        <div className="flex gap-1">
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <Button
                id={`${idPrefix}-model`}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={modelOpen}
                className="w-full justify-between font-normal"
              >
                <span className={cn('truncate', !model && 'text-muted-foreground')}>
                  {model || (make ? `Search ${make} models…` : 'Search any model…')}
                </span>
                <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={make ? `Search ${make} models…` : 'e.g. Odyssey, F-150, Camry'}
                  value={modelQuery}
                  onValueChange={setModelQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {modelQuery.trim()
                      ? 'No model found.'
                      : make
                        ? 'No models for this make.'
                        : 'Type a model name (e.g. Odyssey)'}
                  </CommandEmpty>
                  <CommandGroup>
                    {modelOptions.map((hit) => {
                      const key = `${hit.make}::${hit.model}`;
                      const selected = make === hit.make && model === hit.model;
                      return (
                        <CommandItem
                          key={key}
                          value={key}
                          onSelect={() => selectModel(hit.make, hit.model)}
                        >
                          <Check
                            className={cn('me-2 size-4', selected ? 'opacity-100' : 'opacity-0')}
                          />
                          <span className="truncate">
                            {hit.model}
                            {!make || resolveMake(make) !== hit.make ? (
                              <span className="text-muted-foreground"> · {hit.make}</span>
                            ) : null}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {model ? (
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={clearModel} title="Clear model">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
