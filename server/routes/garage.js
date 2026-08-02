const express = require('express');
const { GarageVehicle, GarageService, LicensePlate } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { isUUID } = require('../lib/uuid');
const {
  normalizePlateNumber,
  normalizeState,
} = require('../lib/plateUtils');

const router = express.Router();
router.use(requireAuth);

const DEFAULT_SERVICES = [
  { service_type: 'registration', title: 'Registration', interval_months: 12 },
  { service_type: 'oil_change', title: 'Oil Change', interval_months: 6 },
  { service_type: 'tire_rotation', title: 'Tire Rotation', interval_months: 6 },
  { service_type: 'brake_inspection', title: 'Brake Inspection', interval_months: 12 },
  { service_type: 'emissions', title: 'Emissions Inspection', interval_months: 24 },
  { service_type: 'tires', title: 'Tread Life', interval_months: null },
];

function addMonths(dateStr, months) {
  if (!dateStr || !months) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  const a = new Date(`${fromIso}T12:00:00`).getTime();
  const b = new Date(`${toIso}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function enrichService(service, today) {
  const j = service.toJSON ? service.toJSON() : { ...service };
  const due = j.due_at;
  if (!due) {
    j.status = 'untracked';
    j.days_remaining = null;
    j.progress_pct = null;
    return j;
  }
  const remaining = daysBetween(today, due);
  j.days_remaining = remaining;
  if (remaining == null) {
    j.status = 'untracked';
  } else if (remaining < 0) {
    j.status = 'overdue';
  } else if (remaining <= 30) {
    j.status = 'due_soon';
  } else {
    j.status = 'ok';
  }

  if (j.interval_months && j.last_done_at) {
    const totalDays = Math.max(1, (j.interval_months * 30.4) | 0);
    const elapsed = daysBetween(j.last_done_at, today) || 0;
    j.progress_pct = Math.max(0, Math.min(100, Math.round((elapsed / totalDays) * 100)));
  } else if (due) {
    // Without interval, show urgency vs 90-day window before due
    const remainingClamped = Math.max(-90, Math.min(90, remaining ?? 0));
    j.progress_pct = Math.round(((90 - remainingClamped) / 180) * 100);
  } else {
    j.progress_pct = null;
  }
  return j;
}

function enrichVehicle(vehicle, today) {
  const j = vehicle.toJSON ? vehicle.toJSON() : { ...vehicle };
  j.services = (j.services || []).map((s) => enrichService(s, today));
  const tracked = j.services.filter((s) => s.status !== 'untracked');
  const healthy = tracked.filter((s) => s.status === 'ok').length;
  j.dashboard_strength = tracked.length
    ? Math.round((healthy / tracked.length) * 100)
    : 0;
  j.overdue_count = j.services.filter((s) => s.status === 'overdue').length;
  return j;
}

function vehicleInclude() {
  return [
    {
      model: GarageService,
      as: 'services',
      separate: true,
      order: [['title', 'ASC']],
    },
    {
      model: LicensePlate,
      as: 'plate',
      required: false,
      attributes: ['id', 'state', 'plate_number', 'display_plate_text', 'slug', 'make', 'model', 'year'],
    },
  ];
}

async function getOwnedVehicle(req, id) {
  if (!isUUID(id)) return null;
  return GarageVehicle.findOne({
    where: { id, user_id: req.session.userId },
    include: vehicleInclude(),
  });
}

router.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await GarageVehicle.findAll({
      where: { user_id: req.session.userId },
      include: vehicleInclude(),
      order: [['updated_at', 'DESC']],
    });
    res.json({
      vehicles: rows.map((v) => enrichVehicle(v, today)),
      total: rows.length,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      nickname,
      year,
      make,
      model,
      trim,
      color,
      body_type = 'other',
      mileage,
      plate_id,
      plate_state,
      plate_number,
      registration_due_at,
      favorite_shop_name,
      favorite_shop_phone,
      favorite_shop_address,
      owner_rating,
      notes,
    } = req.body || {};

    if (!make || !String(make).trim() || !model || !String(model).trim()) {
      return res.status(400).json({ error: 'make and model required' });
    }

    const allowedBody = GarageVehicle.BODY_TYPES || [];
    const bodyType = allowedBody.includes(body_type) ? body_type : 'other';
    const yearNum = year === '' || year == null ? null : parseInt(year, 10);
    const miles = mileage === '' || mileage == null ? null : parseInt(mileage, 10);
    const rating =
      owner_rating === '' || owner_rating == null ? null : parseInt(owner_rating, 10);

    let plateId = null;
    let st = plate_state ? normalizeState(plate_state) : null;
    let num = plate_number ? normalizePlateNumber(plate_number) : null;

    if (plate_id) {
      if (!isUUID(String(plate_id))) return res.status(400).json({ error: 'Invalid plate_id' });
      const plate = await LicensePlate.findByPk(plate_id);
      if (!plate) return res.status(404).json({ error: 'Plate not found' });
      plateId = plate.id;
      st = plate.state;
      num = plate.plate_number;
    }

    const vehicle = await GarageVehicle.create({
      user_id: req.session.userId,
      nickname: nickname ? String(nickname).trim().slice(0, 64) : null,
      year: Number.isFinite(yearNum) ? yearNum : null,
      make: String(make).trim().slice(0, 128),
      model: String(model).trim().slice(0, 128),
      trim: trim ? String(trim).trim().slice(0, 128) : null,
      color: color ? String(color).trim().slice(0, 64) : null,
      body_type: bodyType,
      mileage: Number.isFinite(miles) ? miles : null,
      plate_id: plateId,
      plate_state: st && st.length === 2 ? st : null,
      plate_number: num || null,
      registration_due_at: registration_due_at || null,
      favorite_shop_name: favorite_shop_name || null,
      favorite_shop_phone: favorite_shop_phone || null,
      favorite_shop_address: favorite_shop_address || null,
      owner_rating: rating >= 1 && rating <= 5 ? rating : null,
      notes: notes || null,
    });

    const today = new Date().toISOString().slice(0, 10);
    await GarageService.bulkCreate(
      DEFAULT_SERVICES.map((s) => ({
        vehicle_id: vehicle.id,
        service_type: s.service_type,
        title: s.title,
        interval_months: s.interval_months,
        last_done_at: null,
        due_at:
          s.service_type === 'registration' && registration_due_at
            ? registration_due_at
            : null,
        notes: null,
      }))
    );

    const full = await getOwnedVehicle(req, vehicle.id);
    res.status(201).json({ vehicle: enrichVehicle(full, today) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await getOwnedVehicle(req, req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    const today = new Date().toISOString().slice(0, 10);
    res.json({ vehicle: enrichVehicle(vehicle, today) });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const vehicle = await GarageVehicle.findOne({
      where: { id: req.params.id, user_id: req.session.userId },
    });
    if (!vehicle) return res.status(404).json({ error: 'Not found' });

    const body = req.body || {};
    const updates = {};
    const strFields = [
      'nickname',
      'make',
      'model',
      'trim',
      'color',
      'favorite_shop_name',
      'favorite_shop_phone',
      'favorite_shop_address',
      'notes',
      'registration_due_at',
    ];
    for (const f of strFields) {
      if (body[f] !== undefined) {
        updates[f] = body[f] === '' || body[f] === null ? null : body[f];
      }
    }
    if (body.year !== undefined) {
      if (body.year === '' || body.year == null) updates.year = null;
      else {
        const y = parseInt(body.year, 10);
        updates.year = Number.isFinite(y) ? y : null;
      }
    }
    if (body.mileage !== undefined) {
      if (body.mileage === '' || body.mileage == null) updates.mileage = null;
      else {
        const m = parseInt(body.mileage, 10);
        updates.mileage = Number.isFinite(m) ? m : null;
      }
    }
    if (body.owner_rating !== undefined) {
      if (body.owner_rating === '' || body.owner_rating == null) updates.owner_rating = null;
      else {
        const r = parseInt(body.owner_rating, 10);
        updates.owner_rating = r >= 1 && r <= 5 ? r : null;
      }
    }
    if (body.body_type !== undefined) {
      const allowedBody = GarageVehicle.BODY_TYPES || [];
      updates.body_type = allowedBody.includes(body.body_type) ? body.body_type : vehicle.body_type;
    }
    if (body.plate_state !== undefined || body.plate_number !== undefined) {
      const st = normalizeState(body.plate_state !== undefined ? body.plate_state : vehicle.plate_state);
      const num = normalizePlateNumber(
        body.plate_number !== undefined ? body.plate_number : vehicle.plate_number
      );
      updates.plate_state = st && st.length === 2 ? st : null;
      updates.plate_number = num || null;
    }
    if (body.plate_id !== undefined) {
      if (body.plate_id === null || body.plate_id === '') {
        updates.plate_id = null;
      } else if (isUUID(String(body.plate_id))) {
        const plate = await LicensePlate.findByPk(body.plate_id);
        if (!plate) return res.status(404).json({ error: 'Plate not found' });
        updates.plate_id = plate.id;
        updates.plate_state = plate.state;
        updates.plate_number = plate.plate_number;
      } else {
        return res.status(400).json({ error: 'Invalid plate_id' });
      }
    }

    await vehicle.update(updates);

    if (updates.registration_due_at !== undefined) {
      const reg = await GarageService.findOne({
        where: { vehicle_id: vehicle.id, service_type: 'registration' },
      });
      if (reg) {
        await reg.update({ due_at: updates.registration_due_at });
      }
    }

    const full = await getOwnedVehicle(req, vehicle.id);
    const today = new Date().toISOString().slice(0, 10);
    res.json({ vehicle: enrichVehicle(full, today) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const vehicle = await GarageVehicle.findOne({
      where: { id: req.params.id, user_id: req.session.userId },
    });
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    await GarageService.destroy({ where: { vehicle_id: vehicle.id } });
    await vehicle.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.put('/:id/services/:serviceId', async (req, res, next) => {
  try {
    const vehicle = await GarageVehicle.findOne({
      where: { id: req.params.id, user_id: req.session.userId },
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (!isUUID(req.params.serviceId)) return res.status(400).json({ error: 'Invalid service id' });

    const service = await GarageService.findOne({
      where: { id: req.params.serviceId, vehicle_id: vehicle.id },
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const { last_done_at, due_at, interval_months, notes, title, mark_done } = req.body || {};
    const updates = {};
    if (title !== undefined) updates.title = String(title).trim().slice(0, 128) || service.title;
    if (notes !== undefined) updates.notes = notes || null;
    if (interval_months !== undefined) {
      if (interval_months === '' || interval_months == null) updates.interval_months = null;
      else {
        const n = parseInt(interval_months, 10);
        updates.interval_months = Number.isFinite(n) ? n : null;
      }
    }
    if (mark_done) {
      const today = new Date().toISOString().slice(0, 10);
      updates.last_done_at = today;
      const months = updates.interval_months ?? service.interval_months;
      updates.due_at = months ? addMonths(today, months) : null;
    } else {
      if (last_done_at !== undefined) updates.last_done_at = last_done_at || null;
      if (due_at !== undefined) updates.due_at = due_at || null;
    }

    await service.update(updates);

    if (service.service_type === 'registration' && updates.due_at !== undefined) {
      await vehicle.update({ registration_due_at: updates.due_at });
    }

    const full = await getOwnedVehicle(req, vehicle.id);
    const today = new Date().toISOString().slice(0, 10);
    res.json({ vehicle: enrichVehicle(full, today) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
