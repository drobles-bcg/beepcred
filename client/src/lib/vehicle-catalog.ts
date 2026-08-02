/**
 * Canonical US-market vehicle makes → models for BeepCred form standardization.
 * Names are display values stored on license_plates.make / .model.
 */
export const VEHICLE_CATALOG: Record<string, string[]> = {
  Acura: ['ILX', 'Integra', 'MDX', 'NSX', 'RDX', 'RLX', 'TLX', 'TSX', 'ZDX'],
  'Alfa Romeo': ['4C', 'Giulia', 'Stelvio', 'Tonale'],
  'Aston Martin': ['DB11', 'DB12', 'DBS', 'DBX', 'Vantage'],
  Audi: [
    'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'e-tron', 'e-tron GT', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8',
    'Q8 e-tron', 'R8', 'RS 3', 'RS 5', 'RS 6', 'RS 7', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
    'SQ5', 'SQ7', 'SQ8', 'TT',
  ],
  Bentley: ['Bentayga', 'Continental', 'Flying Spur'],
  BMW: [
    '1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'i3', 'i4',
    'i5', 'i7', 'iX', 'iX1', 'M2', 'M3', 'M4', 'M5', 'M8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
    'XM', 'Z4',
  ],
  Buick: ['Enclave', 'Encore', 'Encore GX', 'Envision', 'LaCrosse', 'Regal'],
  Cadillac: [
    'CT4', 'CT5', 'CT6', 'Escalade', 'Escalade ESV', 'Escalade IQ', 'Lyriq', 'Optiq', 'XT4', 'XT5',
    'XT6',
  ],
  Chevrolet: [
    'Blazer', 'Blazer EV', 'Bolt EUV', 'Bolt EV', 'Camaro', 'Colorado', 'Corvette', 'Cruze',
    'Equinox', 'Equinox EV', 'Express', 'Impala', 'Malibu', 'Silverado 1500', 'Silverado 2500HD',
    'Silverado 3500HD', 'Silverado EV', 'Sonic', 'Spark', 'Suburban', 'Tahoe', 'Trailblazer',
    'Traverse', 'Trax', 'Volt',
  ],
  Chrysler: ['300', 'Pacifica', 'Voyager'],
  Dodge: [
    'Challenger', 'Charger', 'Dart', 'Durango', 'Grand Caravan', 'Hornet', 'Journey', 'Ram 1500',
    'Viper',
  ],
  Ferrari: ['296', '812', 'F8', 'Portofino', 'Purosangue', 'Roma', 'SF90'],
  Fiat: ['500', '500X'],
  Fisker: ['Ocean'],
  Ford: [
    'Bronco', 'Bronco Sport', 'EcoSport', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150',
    'F-150 Lightning', 'F-250', 'F-350', 'Fiesta', 'Flex', 'Focus', 'Fusion', 'GT', 'Mach-E',
    'Maverick', 'Mustang', 'Ranger', 'Taurus', 'Transit', 'Transit Connect',
  ],
  Genesis: ['Electrified G80', 'Electrified GV70', 'G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  GMC: [
    'Acadia', 'Canyon', 'Hummer EV', 'Savana', 'Sierra 1500', 'Sierra 2500HD', 'Sierra 3500HD',
    'Sierra EV', 'Terrain', 'Yukon', 'Yukon XL',
  ],
  Honda: [
    'Accord', 'Civic', 'Clarity', 'CR-V', 'CR-Z', 'Element', 'Fit', 'HR-V', 'Insight', 'Odyssey',
    'Passport', 'Pilot', 'Prologue', 'Ridgeline', 'S2000',
  ],
  Hummer: ['H2', 'H3'],
  Hyundai: [
    'Accent', 'Elantra', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Kona Electric', 'Palisade',
    'Santa Cruz', 'Santa Fe', 'Sonata', 'Tucson', 'Venue', 'Veloster',
  ],
  Infiniti: ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  Jaguar: ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF', 'XJ'],
  Jeep: [
    'Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Grand Cherokee L', 'Grand Wagoneer',
    'Renegade', 'Wagoneer', 'Wrangler',
  ],
  Kia: [
    'Carnival', 'EV6', 'EV9', 'Forte', 'K5', 'Niro', 'Optima', 'Rio', 'Sedona', 'Seltos',
    'Sorento', 'Soul', 'Sportage', 'Stinger', 'Telluride',
  ],
  Lamborghini: ['Aventador', 'Huracan', 'Revuelto', 'Urus'],
  'Land Rover': [
    'Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque',
    'Range Rover Sport', 'Range Rover Velar',
  ],
  Lexus: [
    'CT', 'ES', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'TX', 'UX',
  ],
  Lincoln: ['Aviator', 'Corsair', 'Nautilus', 'Navigator'],
  Lotus: ['Emira', 'Evija'],
  Maserati: ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  Mazda: [
    'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-70', 'CX-9', 'CX-90', 'Mazda3', 'Mazda6', 'MX-5 Miata',
    'MX-30',
  ],
  McLaren: ['720S', '750S', 'Artura', 'GT'],
  'Mercedes-Benz': [
    'A-Class', 'C-Class', 'CLA', 'CLE', 'CLS', 'E-Class', 'EQB', 'EQE', 'EQS', 'G-Class', 'GLA',
    'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'SL', 'AMG GT', 'Sprinter',
  ],
  Mini: ['Clubman', 'Convertible', 'Countryman', 'Hardtop', 'Paceman'],
  Mitsubishi: ['Eclipse Cross', 'Mirage', 'Outlander', 'Outlander Sport'],
  Nissan: [
    'Altima', 'Armada', 'Frontier', 'GT-R', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder',
    'Quest', 'Rogue', 'Sentra', 'Titan', 'Versa', 'Z',
  ],
  Polestar: ['2', '3', '4'],
  Porsche: [
    '718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan',
  ],
  Ram: ['1500', '2500', '3500', 'ProMaster', 'ProMaster City'],
  Rivian: ['R1S', 'R1T'],
  'Rolls-Royce': ['Cullinan', 'Ghost', 'Phantom', 'Spectre'],
  Subaru: [
    'Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX',
  ],
  Tesla: ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'],
  Toyota: [
    '4Runner', '86', 'Avalon', 'bZ4X', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'Crown',
    'GR86', 'GR Corolla', 'GR Supra', 'Highlander', 'Land Cruiser', 'Mirai', 'Prius', 'Prius Prime',
    'RAV4', 'Sequoia', 'Sienna', 'Tacoma', 'Tundra', 'Venza', 'Yaris',
  ],
  Volkswagen: [
    'Arteon', 'Atlas', 'Atlas Cross Sport', 'Golf', 'Golf GTI', 'Golf R', 'ID.4', 'ID.Buzz', 'Jetta',
    'Passat', 'Taos', 'Tiguan',
  ],
  Volvo: ['C40', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'EX30', 'EX90'],
};

export const VEHICLE_MAKES = Object.keys(VEHICLE_CATALOG).sort((a, b) =>
  a.localeCompare(b),
);

export type VehicleModelHit = {
  make: string;
  model: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function modelsForMake(make: string | null | undefined): string[] {
  if (!make) return [];
  const exact = VEHICLE_CATALOG[make];
  if (exact) return exact;
  const key = VEHICLE_MAKES.find((m) => normalize(m) === normalize(make));
  return key ? VEHICLE_CATALOG[key] : [];
}

export function resolveMake(make: string | null | undefined): string | null {
  if (!make?.trim()) return null;
  if (VEHICLE_CATALOG[make]) return make;
  return VEHICLE_MAKES.find((m) => normalize(m) === normalize(make)) || null;
}

/** Search models across all makes (or one make). Odyssey → Honda. */
export function searchModels(
  query: string,
  makeFilter?: string | null,
  limit = 40,
): VehicleModelHit[] {
  const q = normalize(query);
  const resolvedFilter = makeFilter ? resolveMake(makeFilter) : null;
  const makes = resolvedFilter ? [resolvedFilter] : VEHICLE_MAKES;

  // Without a make filter, require a search query (keeps the list useful)
  if (!q && !resolvedFilter) return [];

  const hits: VehicleModelHit[] = [];

  for (const make of makes) {
    for (const model of VEHICLE_CATALOG[make] || []) {
      if (!q) {
        hits.push({ make, model });
      } else {
        const modelNorm = normalize(model);
        const makeNorm = normalize(make);
        if (modelNorm.includes(q) || makeNorm.includes(q) || normalize(`${make}${model}`).includes(q)) {
          hits.push({ make, model });
        }
      }
      if (hits.length >= limit * 3) break;
    }
    if (hits.length >= limit * 3) break;
  }

  if (q) {
    hits.sort((a, b) => {
      const aStarts = normalize(a.model).startsWith(q) ? 0 : 1;
      const bStarts = normalize(b.model).startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aExact = normalize(a.model) === q ? 0 : 1;
      const bExact = normalize(b.model) === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.model.localeCompare(b.model) || a.make.localeCompare(b.make);
    });
  }

  return hits.slice(0, limit);
}

export function searchMakes(query: string, limit = 30): string[] {
  const q = normalize(query);
  if (!q) return VEHICLE_MAKES.slice(0, limit);
  return VEHICLE_MAKES.filter((m) => normalize(m).includes(q)).slice(0, limit);
}

export function isKnownMake(make: string | null | undefined): boolean {
  return Boolean(resolveMake(make));
}

export function isKnownModel(make: string | null | undefined, model: string | null | undefined): boolean {
  if (!model?.trim()) return false;
  const resolved = resolveMake(make);
  if (!resolved) {
    // allow finding model globally
    return VEHICLE_MAKES.some((m) =>
      (VEHICLE_CATALOG[m] || []).some((mod) => normalize(mod) === normalize(model)),
    );
  }
  return (VEHICLE_CATALOG[resolved] || []).some((mod) => normalize(mod) === normalize(model));
}
