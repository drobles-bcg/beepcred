import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Helmet } from 'react-helmet-async';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

export function SubmitPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState('CA');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [bodyType, setBodyType] = useState('other');
  const [caption, setCaption] = useState('');
  const [shotType, setShotType] = useState('plate');
  const [city, setCity] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pick an image');
      const { data: plateRes } = await api.post('/api/plates', {
        state,
        plate_number: plateNumber,
        country: 'US',
        make: make || undefined,
        model: model || undefined,
        year: year ? parseInt(year, 10) : undefined,
        color: color || undefined,
        body_type: bodyType,
      });
      const plateId = plateRes.plate.id;
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', caption);
      fd.append('shot_type', shotType);
      if (city) fd.append('city', city);
      await api.post(`/api/plates/${plateId}/images`, fd);
      const p = plateRes.plate as { state: string; plate_number: string; display_plate_text?: string | null };
      const routePlate = p.display_plate_text || p.plate_number;
      navigate(`/plate/${p.state.toLowerCase()}/${encodeURIComponent(routePlate)}`);
    },
  });

  return (
    <>
      <Helmet>
        <title>Submit — BeepCred</title>
      </Helmet>
      <div className="container mx-auto max-w-xl px-4 pb-10">
        <Card>
          <CardHeader>
            <CardTitle>Submit a plate photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plate number</Label>
                <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input value={make} onChange={(e) => setMake(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Shot type</Label>
                <Select value={shotType} onValueChange={setShotType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plate">Plate</SelectItem>
                    <SelectItem value="front">Front</SelectItem>
                    <SelectItem value="rear">Rear</SelectItem>
                    <SelectItem value="side">Side</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City (optional)</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            {submit.isError && (
              <p className="text-sm text-destructive">{(submit.error as Error)?.message || 'Failed'}</p>
            )}
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
