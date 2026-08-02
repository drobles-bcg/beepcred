import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Gauge,
  MapPin,
  Phone,
  Star,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/api/http';
import type { GarageService, GarageVehicle } from '@/pages/beepcred/account/account-garage-page';
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
import { cn } from '@/lib/utils';

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

function statusLabel(status?: GarageService['status']) {
  if (status === 'overdue') return 'Overdue';
  if (status === 'due_soon') return 'Due soon';
  if (status === 'ok') return 'On track';
  return 'Not tracking';
}

function formatRemaining(days: number | null | undefined) {
  if (days == null) return null;
  if (days < 0) {
    const abs = Math.abs(days);
    if (abs >= 30) return `${Math.round(abs / 30)} mo overdue`;
    return `${abs} day${abs === 1 ? '' : 's'} overdue`;
  }
  if (days >= 30) return `${Math.round(days / 30)} mo left`;
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function AccountGarageVehiclePage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [mileageDraft, setMileageDraft] = useState('');
  const [shopOpen, setShopOpen] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [serviceEdit, setServiceEdit] = useState<GarageService | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [lastDone, setLastDone] = useState('');
  const [intervalMonths, setIntervalMonths] = useState('');
  const [formError, setFormError] = useState('');

  const vehicleQ = useQuery({
    queryKey: ['garage', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/garage/${id}`);
      return data.vehicle as GarageVehicle & {
        favorite_shop_phone?: string | null;
        favorite_shop_address?: string | null;
        notes?: string | null;
      };
    },
    enabled: !!id,
  });

  const v = vehicleQ.data;

  useEffect(() => {
    if (v) {
      setMileageDraft(v.mileage != null ? String(v.mileage) : '');
      setShopName(v.favorite_shop_name || '');
      setShopPhone(v.favorite_shop_phone || '');
      setShopAddress(v.favorite_shop_address || '');
    }
  }, [v]);

  const saveMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.put(`/api/garage/${id}`, payload);
      return data.vehicle as GarageVehicle;
    },
    onSuccess: async () => {
      setFormError('');
      setShopOpen(false);
      await qc.invalidateQueries({ queryKey: ['garage', id] });
      await qc.invalidateQueries({ queryKey: ['garage'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Save failed')),
  });

  const serviceMut = useMutation({
    mutationFn: async (payload: { serviceId: string; body: Record<string, unknown> }) => {
      const { data } = await api.put(`/api/garage/${id}/services/${payload.serviceId}`, payload.body);
      return data.vehicle as GarageVehicle;
    },
    onSuccess: async () => {
      setServiceEdit(null);
      setFormError('');
      await qc.invalidateQueries({ queryKey: ['garage', id] });
      await qc.invalidateQueries({ queryKey: ['garage'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not update service')),
  });

  if (vehicleQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading vehicle…</p>;
  }
  if (vehicleQ.isError || !v) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Vehicle not found.</p>
        <Button asChild variant="outline">
          <Link to="/account/garage">Back to garage</Link>
        </Button>
      </div>
    );
  }

  const services = v.services || [];
  const registration = services.find((s) => s.service_type === 'registration');
  const overdueServices = services.filter((s) => s.status === 'overdue');
  const primaryAlert = overdueServices[0] || services.find((s) => s.status === 'due_soon');

  return (
    <>
      <Helmet>
        <title>{vehicleTitle(v)} — Garage — BeepCred</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <Link
            to="/account/garage"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Garage
          </Link>
          {v.nickname ? (
            <p className="text-sm font-medium text-[oklch(0.45_0.08_240)]">{v.nickname}</p>
          ) : null}
          <h2 className="text-2xl font-semibold tracking-tight">{vehicleTitle(v)}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {v.plate_state && v.plate_number ? (
              <Badge variant="outline" className="font-mono tracking-wide">
                {v.plate_state} {v.plate_number}
              </Badge>
            ) : (
              <Badge variant="secondary">No plate linked</Badge>
            )}
            {v.color ? <Badge variant="outline" className="capitalize">{v.color}</Badge> : null}
            <Badge variant="outline" className="capitalize">
              {v.body_type}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Snapshot
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Gauge className="size-4" />
                    Mileage
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-8 w-24 text-end"
                      value={mileageDraft}
                      onChange={(e) => setMileageDraft(e.target.value)}
                      onBlur={() => {
                        const next = mileageDraft.trim();
                        const current = v.mileage != null ? String(v.mileage) : '';
                        if (next !== current) {
                          saveMut.mutate({ mileage: next || null });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Star className="size-4" />
                    My rating
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={cn(
                          'p-0.5',
                          (v.owner_rating || 0) >= n ? 'text-amber-500' : 'text-muted-foreground/30',
                        )}
                        onClick={() => saveMut.mutate({ owner_rating: n })}
                      >
                        <Star className="size-4 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dashboard strength</span>
                  <span className="font-medium">{v.dashboard_strength ?? 0}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[oklch(0.45_0.08_240)] transition-all"
                    style={{ width: `${v.dashboard_strength ?? 0}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Based on tracked services that are currently on schedule.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Favorite shop
                </p>
                <Button size="sm" variant="ghost" onClick={() => setShopOpen(true)}>
                  Edit
                </Button>
              </div>
              {v.favorite_shop_name ? (
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">{v.favorite_shop_name}</p>
                  {v.favorite_shop_phone ? (
                    <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3.5" />
                      {v.favorite_shop_phone}
                    </p>
                  ) : null}
                  {v.favorite_shop_address ? (
                    <p className="inline-flex items-start gap-1.5 text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      {v.favorite_shop_address}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No shop saved yet.</p>
              )}
            </div>
          </aside>

          <div className="space-y-4">
            {primaryAlert ? (
              <div
                className={cn(
                  'rounded-2xl border p-5',
                  primaryAlert.status === 'overdue'
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-amber-500/30 bg-amber-500/5',
                )}
              >
                <div className="flex items-start gap-3">
                  <CircleAlert
                    className={cn(
                      'mt-0.5 size-5',
                      primaryAlert.status === 'overdue' ? 'text-destructive' : 'text-amber-600',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold tracking-tight">
                      {primaryAlert.title}{' '}
                      {primaryAlert.status === 'overdue' ? 'overdue' : 'coming up'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {primaryAlert.due_at
                        ? `Due ${new Date(`${primaryAlert.due_at}T12:00:00`).toLocaleDateString()}`
                        : 'Set a due date to start tracking'}
                      {primaryAlert.days_remaining != null
                        ? ` · ${formatRemaining(primaryAlert.days_remaining)}`
                        : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          serviceMut.mutate({
                            serviceId: primaryAlert.id,
                            body: { mark_done: true },
                          })
                        }
                      >
                        Mark done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setServiceEdit(primaryAlert);
                          setDueAt(primaryAlert.due_at || '');
                          setLastDone(primaryAlert.last_done_at || '');
                          setIntervalMonths(
                            primaryAlert.interval_months != null
                              ? String(primaryAlert.interval_months)
                              : '',
                          );
                        }}
                      >
                        Edit schedule
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Nothing urgent</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add due dates to registration and service items to start tracking.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Maintenance & compliance</p>
              </div>
              <ul className="divide-y divide-border">
                {services.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      {s.service_type === 'registration' ? (
                        <CalendarClock className="size-4" />
                      ) : (
                        <Wrench className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{s.title}</p>
                        <Badge
                          variant={
                            s.status === 'overdue'
                              ? 'destructive'
                              : s.status === 'due_soon'
                                ? 'warning'
                                : s.status === 'ok'
                                  ? 'success'
                                  : 'outline'
                          }
                          className="capitalize"
                        >
                          {statusLabel(s.status)}
                        </Badge>
                      </div>
                      {s.due_at || s.status !== 'untracked' ? (
                        <div className="mt-2 max-w-sm">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                s.status === 'overdue'
                                  ? 'bg-destructive'
                                  : s.status === 'due_soon'
                                    ? 'bg-amber-500'
                                    : 'bg-[oklch(0.45_0.08_240)]',
                              )}
                              style={{ width: `${s.progress_pct ?? 0}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatRemaining(s.days_remaining) ||
                              (s.due_at
                                ? `Due ${new Date(`${s.due_at}T12:00:00`).toLocaleDateString()}`
                                : 'No schedule yet')}
                            {s.interval_months ? ` · every ${s.interval_months} mo` : ''}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No recent service record</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {s.status === 'untracked' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setServiceEdit(s);
                            setDueAt('');
                            setLastDone('');
                            setIntervalMonths(
                              s.interval_months != null ? String(s.interval_months) : '',
                            );
                          }}
                        >
                          Start tracking
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={serviceMut.isPending}
                            onClick={() =>
                              serviceMut.mutate({ serviceId: s.id, body: { mark_done: true } })
                            }
                          >
                            Done
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setServiceEdit(s);
                              setDueAt(s.due_at || '');
                              setLastDone(s.last_done_at || '');
                              setIntervalMonths(
                                s.interval_months != null ? String(s.interval_months) : '',
                              );
                            }}
                          >
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {registration?.status === 'overdue' && (
              <div className="rounded-2xl border border-border p-4 text-sm">
                <p className="font-medium">Registration in {v.plate_state || 'your state'}</p>
                <p className="mt-1 text-muted-foreground">
                  BeepCred tracks the date you set — renew with your DMV, then mark it done here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Favorite shop</DialogTitle>
            <DialogDescription>Save your go-to service location for this car.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shop-name">Name</Label>
              <Input id="shop-name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shop-phone">Phone</Label>
              <Input
                id="shop-phone"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shop-address">Address</Label>
              <Input
                id="shop-address"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveMut.mutate({
                  favorite_shop_name: shopName || null,
                  favorite_shop_phone: shopPhone || null,
                  favorite_shop_address: shopAddress || null,
                })
              }
              disabled={saveMut.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!serviceEdit} onOpenChange={(open) => !open && setServiceEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{serviceEdit?.title || 'Service'}</DialogTitle>
            <DialogDescription>Set last service date, due date, and interval.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="last-done">Last done</Label>
              <Input
                id="last-done"
                type="date"
                value={lastDone}
                onChange={(e) => setLastDone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-at">Due date</Label>
              <Input
                id="due-at"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interval">Interval (months)</Label>
              <Input
                id="interval"
                type="number"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceEdit(null)}>
              Cancel
            </Button>
            <Button
              disabled={serviceMut.isPending || !serviceEdit}
              onClick={() =>
                serviceEdit &&
                serviceMut.mutate({
                  serviceId: serviceEdit.id,
                  body: {
                    last_done_at: lastDone || null,
                    due_at: dueAt || null,
                    interval_months: intervalMonths || null,
                  },
                })
              }
            >
              Save schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
