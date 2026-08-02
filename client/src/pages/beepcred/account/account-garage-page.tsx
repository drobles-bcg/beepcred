import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { Car, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/api/http';
import { MakeModelPicker } from '@/components/beepcred/make-model-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BODY_TYPES } from '@/lib/create-plate';

export type GarageService = {
  id: string;
  service_type: string;
  title: string;
  last_done_at: string | null;
  due_at: string | null;
  interval_months: number | null;
  status?: 'ok' | 'due_soon' | 'overdue' | 'untracked';
  days_remaining?: number | null;
  progress_pct?: number | null;
};

export type GarageVehicle = {
  id: string;
  nickname: string | null;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  color: string | null;
  body_type: string;
  mileage: number | null;
  plate_state: string | null;
  plate_number: string | null;
  ownership_status?: 'current' | 'former' | string;
  registration_due_at: string | null;
  favorite_shop_name: string | null;
  owner_rating: number | null;
  dashboard_strength?: number;
  overdue_count?: number;
  services?: GarageService[];
};

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function vehicleTitle(v: GarageVehicle) {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
}

function BodyGlyph({ bodyType }: { bodyType: string }) {
  // Simple typographic stand-in — keeps UI light without asset packs
  const label =
    bodyType === 'truck'
      ? 'Truck'
      : bodyType === 'suv'
        ? 'SUV'
        : bodyType === 'minivan'
          ? 'Van'
          : bodyType === 'coupe'
            ? 'Coupe'
            : 'Car';
  return (
    <div className="flex size-14 items-center justify-center rounded-2xl bg-[oklch(0.35_0.04_240)] text-[11px] font-semibold tracking-wide text-white">
      {label}
    </div>
  );
}

export function AccountGaragePage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<GarageVehicle | null>(null);
  const [formError, setFormError] = useState('');
  const [nickname, setNickname] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [trim, setTrim] = useState('');
  const [color, setColor] = useState('');
  const [bodyType, setBodyType] = useState('other');
  const [mileage, setMileage] = useState('');
  const [plateState, setPlateState] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  const garageQ = useQuery({
    queryKey: ['garage'],
    queryFn: async () => {
      const { data } = await api.get('/api/garage');
      return data as { vehicles: GarageVehicle[]; total: number };
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/garage', {
        nickname: nickname || undefined,
        make,
        model,
        year: year || undefined,
        trim: trim || undefined,
        color: color || undefined,
        body_type: bodyType,
        mileage: mileage || undefined,
        plate_state: plateState || undefined,
        plate_number: plateNumber || undefined,
      });
      return data.vehicle as GarageVehicle;
    },
    onSuccess: async () => {
      setAddOpen(false);
      resetForm();
      await qc.invalidateQueries({ queryKey: ['garage'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not add car')),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/garage/${id}`);
    },
    onSuccess: async () => {
      setRemoveTarget(null);
      await qc.invalidateQueries({ queryKey: ['garage'] });
    },
  });

  function resetForm() {
    setFormError('');
    setNickname('');
    setMake('');
    setModel('');
    setYear('');
    setTrim('');
    setColor('');
    setBodyType('other');
    setMileage('');
    setPlateState('');
    setPlateNumber('');
  }

  const vehicles = garageQ.data?.vehicles || [];

  return (
    <>
      <Helmet>
        <title>Garage — BeepCred</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Cars I own</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current vehicles only — claim a plate from its page, or add a car manually.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add a car
          </Button>
        </div>

        {garageQ.isLoading && <p className="text-sm text-muted-foreground">Loading garage…</p>}
        {garageQ.isError && (
          <p className="text-sm text-destructive">
            {apiErrorMessage(garageQ.error, 'Failed to load garage')}
          </p>
        )}

        {!garageQ.isLoading && vehicles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <Car className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <p className="font-medium">Your garage is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a car to track registration and maintenance.
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              Add a car
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="group relative rounded-2xl border border-border bg-background p-4 transition-colors hover:border-foreground/20"
            >
              <Link to={`/account/garage/${v.id}`} className="flex gap-4">
                <BodyGlyph bodyType={v.body_type} />
                <div className="min-w-0 flex-1">
                  {v.nickname ? (
                    <p className="text-sm font-medium text-[oklch(0.45_0.08_240)]">{v.nickname}</p>
                  ) : null}
                  <p className="truncate font-semibold tracking-tight">{vehicleTitle(v)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v.plate_state && v.plate_number ? (
                      <Badge variant="outline" className="font-mono tracking-wide">
                        {v.plate_state} {v.plate_number}
                      </Badge>
                    ) : null}
                    {(v.overdue_count || 0) > 0 ? (
                      <Badge variant="destructive">{v.overdue_count} overdue</Badge>
                    ) : (
                      <Badge variant="secondary">Dashboard {v.dashboard_strength ?? 0}%</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {v.mileage != null ? `${v.mileage.toLocaleString()} mi` : 'Mileage not set'}
                    {v.favorite_shop_name ? ` · ${v.favorite_shop_name}` : ''}
                  </p>
                </div>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="absolute end-2 top-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                title="Remove"
                onClick={() => setRemoveTarget(v)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {vehicles.length > 0 && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAddOpen(true);
              }}
              className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="size-5" />
              Add a car
            </button>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a car</DialogTitle>
            <DialogDescription>
              Save a vehicle to your garage. You can attach a plate and service dates next.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nick">Nickname (optional)</Label>
              <Input
                id="nick"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Padme"
              />
            </div>
            <MakeModelPicker
              make={make}
              model={model}
              onChange={({ make: m, model: mo }) => {
                setMake(m);
                setModel(mo);
              }}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trim">Trim</Label>
                <Input id="trim" value={trim} onChange={(e) => setTrim(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="color">Color</Label>
                <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="body">Body</Label>
                <select
                  id="body"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                >
                  {BODY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="miles">Mileage</Label>
                <Input
                  id="miles"
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pstate">Plate state</Label>
                <Input
                  id="pstate"
                  className="uppercase"
                  maxLength={2}
                  value={plateState}
                  onChange={(e) => setPlateState(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pnum">Plate number</Label>
                <Input
                  id="pnum"
                  className="uppercase"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !make || !model}
            >
              {createMut.isPending ? 'Adding…' : 'Add car'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove car?</DialogTitle>
            <DialogDescription>
              Removes {removeTarget ? vehicleTitle(removeTarget) : 'this car'} and its service
              tracking from your garage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending || !removeTarget}
              onClick={() => removeTarget && deleteMut.mutate(removeTarget.id)}
            >
              {deleteMut.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
