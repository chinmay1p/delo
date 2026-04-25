import pool from '../../lib/db.js';

function getId(rawId) {
  if (Array.isArray(rawId)) {
    return String(rawId[0] ?? '').trim();
  }
  return String(rawId ?? '').trim();
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function normalizePhone(value) {
  const str = toNullableString(value);
  if (!str) {
    return null;
  }

  const digits = str.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function normalizeCgpa(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }

  return Number.isInteger(num) ? num : Math.trunc(num);
}

function toNullableBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const str = String(value).trim().toLowerCase();
  if (str === 'true' || str === '1' || str === 'yes') return true;
  if (str === 'false' || str === '0' || str === 'no') return false;
  return null;
}

async function getCandidate(req, res, id) {
  const resumeOnly = toBool(req.query.resume_only, false);

  if (resumeOnly) {
    const result = await pool.query(
      `SELECT resume_url
       FROM candidates
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    return res.status(200).json({ url: result.rows[0]?.resume_url || null });
  }

  const result = await pool.query(
    `SELECT *
     FROM candidates
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  return res.status(200).json(result.rows[0]);
}

async function updateCandidate(req, res, id) {
  const body = req.body ?? {};

  const fieldValuePairs = [
    ['name', toNullableString(body.name)],
    ['email', toNullableString(body.email)?.toLowerCase() ?? undefined],
    ['phone', normalizePhone(body.phone)],
    ['college_name', toNullableString(body.college_name)],
    ['education', toNullableString(body.education)],
    ['stream', toNullableString(body.stream)],
    ['gender', toNullableString(body.gender)],
    ['cgpa', normalizeCgpa(body.cgpa)],
    ['resume_url', toNullableString(body.resume_url)],
    ['experience', toNullableInt(body.experience)],
    ['year_of_passing', toNullableInt(body.year_of_passing)],
    ['relocation_available', toNullableBoolean(body.relocation_available)],
  ];

  const fields = [];
  const values = [];
  let index = 1;

  for (const [name, value] of fieldValuePairs) {
    if (body[name] !== undefined) {
      fields.push(`${name} = $${index++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE candidates
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING *`,
    values
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  return res.status(200).json(result.rows[0]);
}

async function deleteCandidate(res, id) {
  const result = await pool.query(
    `DELETE FROM candidates
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  return res.status(200).json({ message: 'Candidate deleted', candidate: result.rows[0] });
}

export default async function handler(req, res) {
  try {
    const id = getId(req.query.id);

    if (!id) {
      return res.status(400).json({ error: 'Candidate id is required' });
    }

    if (req.method === 'GET') {
      return await getCandidate(req, res, id);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      return await updateCandidate(req, res, id);
    }

    if (req.method === 'DELETE') {
      return await deleteCandidate(res, id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Candidate with this email already exists' });
    }

    return res.status(500).json({ error: err.message });
  }
}
