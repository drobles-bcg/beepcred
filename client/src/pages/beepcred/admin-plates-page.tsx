import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/http';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BODY_TYPES,
  SHOT_TYPES,
  createPlateWithImage,
} from '@/lib/create-plate';
import { PlateTypesMultiSelect } from '@/components/beepcred/plate-types-multi-select';
import { MakeModelPicker } from '@/components/beepcred/make-model-picker';

type AdminPlate = {
  id: string;
  plate_number: string;
  display_plate_text: string | null;
  state: string;
  country: string;
  slug: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  body_type: string;
  cred_score: number;
  plate_types?: string[] | null;
  plus_count?: number;
  minus_count?: number;
  view_count?: number;
  comment_count?: number;
  created_at: string;
  createdAt?: string;
  last_seen_at?: string | null;
  primaryImage?: {
    id: string;
    image_url: string;
    thumbnail_url?: string | null;
  } | null;
};

type PlateFormState = {
  plate_number: string;
  display_plate_text: string;
  state: string;
  country: string;
  make: string;
  model: string;
  year: string;
  color: string;
  body_type: string;
  cred_score: string;
  plate_types: string[];
  caption: string;
  shot_type: string;
  city: string;
};

const emptyForm = (): PlateFormState => ({
  plate_number: '',
  display_plate_text: '',
  state: '',
  country: 'US',
  make: '',
  model: '',
  year: '',
  color: '',
  body_type: 'other',
  cred_score: '0',
  plate_types: [],
  caption: '',
  shot_type: 'plate',
  city: '',
});

function formFromPlate(p: AdminPlate): PlateFormState {
  return {
    plate_number: p.plate_number || '',
    display_plate_text: p.display_plate_text || '',
    state: p.state || '',
    country: p.country || 'US',
    make: p.make || '',
    model: p.model || '',
    year: p.year != null ? String(p.year) : '',
    color: p.color || '',
    body_type: p.body_type || 'other',
    cred_score: String(p.cred_score ?? 0),
    plate_types: Array.isArray(p.plate_types) ? [...p.plate_types] : [],
    caption: '',
    shot_type: 'plate',
    city: '',
  };
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function vehicleLabel(p: AdminPlate) {
  const parts = [p.year, p.make, p.model, p.color].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

export function AdminPlatesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlate | null>(null);
  const [form, setForm] = useState<PlateFormState>(emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminPlate | null>(null);

  const platesQuery = useQuery({
    queryKey: ['admin', 'plates', q, stateFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/plates', {
        params: {
          limit: 100,
          q: q || undefined,
          state: stateFilter || undefined,
        },
      });
      return data as { plates: AdminPlate[]; total: number };
    },
  });

  const plates = platesQuery.data?.plates || [];
  const total = platesQuery.data?.total ?? plates.length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const payload = {
          plate_number: form.plate_number,
          display_plate_text: form.display_plate_text || form.plate_number,
          state: form.state,
          country: form.country || 'US',
          make: form.make || null,
          model: form.model || null,
          year: form.year || null,
          color: form.color || null,
          body_type: form.body_type || 'other',
          cred_score: form.cred_score,
          plate_types: form.plate_types,
        };
        const { data } = await api.put(`/api/admin/plates/${editing.id}`, payload);
        if (file) {
          const fd = new FormData();
          fd.append('image', file);
          if (form.caption) fd.append('caption', form.caption);
          fd.append('shot_type', form.shot_type || 'plate');
          if (form.city) fd.append('city', form.city);
          await api.post(`/api/plates/${editing.id}/images`, fd, {
            headers: { 'Content-Type': undefined as unknown as string },
          });
        }
        return data.plate as AdminPlate;
      }

      let plate: AdminPlate;

      if (file) {
        const created = await createPlateWithImage(
          {
            state: form.state,
            plate_number: form.plate_number,
            country: form.country || 'US',
            display_plate_text: form.display_plate_text || undefined,
            make: form.make,
            model: form.model,
            year: form.year,
            color: form.color,
            body_type: form.body_type || 'other',
            plate_types: form.plate_types,
          },
          {
            file,
            caption: form.caption,
            shot_type: form.shot_type,
            city: form.city,
          },
        );
        plate = created.plate as unknown as AdminPlate;
      } else {
        const { data } = await api.post('/api/admin/plates', {
          plate_number: form.plate_number,
          display_plate_text: form.display_plate_text || form.plate_number,
          state: form.state,
          country: form.country || 'US',
          make: form.make || null,
          model: form.model || null,
          year: form.year || null,
          color: form.color || null,
          body_type: form.body_type || 'other',
          cred_score: form.cred_score,
          plate_types: form.plate_types,
        });
        plate = data.plate as AdminPlate;
      }

      const cred = parseInt(form.cred_score, 10);
      if (file && (form.plate_types.length || (Number.isFinite(cred) && cred !== 0))) {
        const { data } = await api.put(`/api/admin/plates/${plate.id}`, {
          cred_score: Number.isFinite(cred) ? cred : undefined,
          plate_types: form.plate_types,
        });
        return data.plate as AdminPlate;
      }

      return plate;
    },
    onSuccess: async () => {
      setFormError('');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      setFile(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'plates'] });
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not save plate')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/plates/${id}`);
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'plates'] });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFile(null);
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(p: AdminPlate) {
    setEditing(p);
    setForm(formFromPlate(p));
    setFile(null);
    setFormError('');
    setDialogOpen(true);
  }

  return (
    <>
      <Helmet>
        <title>Plates — Admin — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-12 pt-2">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Plates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} plate{total === 1 ? '' : 's'} in the database
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add plate
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-8"
              placeholder="Search plate, make, model, slug…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Input
            className="w-24 uppercase"
            placeholder="State"
            maxLength={2}
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Cred</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading plates…
                  </TableCell>
                </TableRow>
              )}
              {platesQuery.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    {apiErrorMessage(platesQuery.error, 'Failed to load plates')}
                  </TableCell>
                </TableRow>
              )}
              {!platesQuery.isLoading && !platesQuery.isError && plates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No plates match these filters.
                  </TableCell>
                </TableRow>
              )}
              {plates.map((p) => {
                const thumb = p.primaryImage?.thumbnail_url || p.primaryImage?.image_url;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-12 overflow-hidden rounded-md border border-border bg-muted">
                          {thumb ? (
                            <img src={thumb} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/plate/${encodeURIComponent(p.state)}/${encodeURIComponent(p.plate_number)}`}
                            className="font-semibold tracking-wide hover:underline"
                          >
                            {p.state} {p.display_plate_text || p.plate_number}
                          </Link>
                          <div className="truncate text-xs text-muted-foreground">{p.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-sm">{vehicleLabel(p)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="capitalize">
                          {p.body_type || 'other'}
                        </Badge>
                        {Array.isArray(p.plate_types) && p.plate_types.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.plate_types.map((t) => (
                              <Badge key={t} variant="secondary" className="capitalize text-[10px]">
                                {t.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{p.cred_score}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(p.created_at || p.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Edit">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setFile(null);
            setFormError('');
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit plate' : 'Create plate'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update ${editing.state} ${editing.plate_number}`
                : 'Add a license plate record. Photo is optional.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="plate-photo">Photo (optional)</Label>
              <Input
                id="plate-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground truncate">{file.name}</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="plate-state">State</Label>
                <Input
                  id="plate-state"
                  className="uppercase"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="plate-number">Plate number</Label>
                <Input
                  id="plate-number"
                  className="uppercase"
                  value={form.plate_number}
                  onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plate-display">Display text</Label>
              <Input
                id="plate-display"
                value={form.display_plate_text}
                onChange={(e) => setForm((f) => ({ ...f, display_plate_text: e.target.value }))}
                placeholder="Optional user-facing text"
              />
            </div>
            <MakeModelPicker
              idPrefix={editing ? 'edit-vehicle' : 'create-vehicle'}
              make={form.make}
              model={form.model}
              onChange={({ make, model }) => setForm((f) => ({ ...f, make, model }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="plate-year">Year</Label>
                <Input
                  id="plate-year"
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plate-color">Color</Label>
                <Input
                  id="plate-color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plate-country">Country</Label>
                <Input
                  id="plate-country"
                  className="uppercase"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plate-body">Body type</Label>
                <select
                  id="plate-body"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                  value={form.body_type}
                  onChange={(e) => setForm((f) => ({ ...f, body_type: e.target.value }))}
                >
                  {BODY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plate-cred">Cred score</Label>
                <Input
                  id="plate-cred"
                  type="number"
                  value={form.cred_score}
                  onChange={(e) => setForm((f) => ({ ...f, cred_score: e.target.value }))}
                />
              </div>
            </div>
            <PlateTypesMultiSelect
              idPrefix={editing ? 'edit-plate-type' : 'create-plate-type'}
              value={form.plate_types}
              onChange={(plate_types) => setForm((f) => ({ ...f, plate_types }))}
            />
            {file && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plate-shot">Shot type</Label>
                  <select
                    id="plate-shot"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                    value={form.shot_type}
                    onChange={(e) => setForm((f) => ({ ...f, shot_type: e.target.value }))}
                  >
                    {SHOT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plate-city">City (optional)</Label>
                  <Input
                    id="plate-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>
            )}
            {file && (
              <div className="space-y-1.5">
                <Label htmlFor="plate-caption">Caption (optional)</Label>
                <Input
                  id="plate-caption"
                  value={form.caption}
                  onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                />
              </div>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                form.state.trim().length !== 2 ||
                !form.plate_number.trim()
              }
            >
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create plate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete plate?</DialogTitle>
            <DialogDescription>
              This permanently removes {deleteTarget?.state} {deleteTarget?.plate_number}, including
              related images, votes, and comments.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              {apiErrorMessage(deleteMutation.error, 'Delete failed')}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
