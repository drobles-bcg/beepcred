import { api } from '@/api/http';

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
] as const;

export const BODY_TYPES = [
  'sedan',
  'suv',
  'truck',
  'coupe',
  'convertible',
  'minivan',
  'wagon',
  'hatchback',
  'van',
  'other',
] as const;

export const SHOT_TYPES = ['plate', 'front', 'rear', 'side'] as const;

export type CreatePlateFields = {
  state: string;
  plate_number: string;
  country?: string;
  display_plate_text?: string;
  make?: string;
  model?: string;
  year?: string | number | null;
  color?: string;
  body_type?: string;
};

export type CreatePlateImageFields = {
  file: File;
  caption?: string;
  shot_type?: string;
  city?: string;
  state_location?: string;
};

export type CreatedPlate = {
  id: string;
  state: string;
  plate_number: string;
  display_plate_text?: string | null;
  slug?: string;
  [key: string]: unknown;
};

/**
 * Shared create flow for admin and user submit:
 * 1) POST /api/plates (find-or-create)
 * 2) POST /api/plates/:id/images (multipart)
 */
export async function createPlateWithImage(
  fields: CreatePlateFields,
  image: CreatePlateImageFields,
): Promise<{ plate: CreatedPlate; created: boolean }> {
  if (!image?.file) {
    throw new Error('Pick an image');
  }

  const yearRaw = fields.year;
  const year =
    yearRaw === '' || yearRaw === null || yearRaw === undefined
      ? undefined
      : typeof yearRaw === 'number'
        ? yearRaw
        : parseInt(String(yearRaw), 10);

  const { data: plateRes } = await api.post('/api/plates', {
    state: fields.state,
    plate_number: fields.plate_number,
    country: fields.country || 'US',
    display_plate_text: fields.display_plate_text || undefined,
    make: fields.make || undefined,
    model: fields.model || undefined,
    year: Number.isFinite(year as number) ? year : undefined,
    color: fields.color || undefined,
    body_type: fields.body_type || 'other',
  });

  const plate = plateRes.plate as CreatedPlate;
  const plateId = plate.id;

  const fd = new FormData();
  fd.append('image', image.file);
  if (image.caption) fd.append('caption', image.caption);
  fd.append('shot_type', image.shot_type || 'plate');
  if (image.city) fd.append('city', image.city);
  if (image.state_location) fd.append('state_location', image.state_location);

  await api.post(`/api/plates/${plateId}/images`, fd, {
    // Let the browser set multipart boundary (default JSON Content-Type breaks uploads)
    headers: { 'Content-Type': undefined as unknown as string },
  });

  return { plate, created: Boolean(plateRes.created) };
}
