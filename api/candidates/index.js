import pool from '../../lib/db.js';

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

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

async function listCandidates(req, res) {
  const { id, email } = req.query;
  const resumeOnly = toBool(req.query.resume_only, false);

  if (id && resumeOnly) {
    const result = await pool.query(
      `SELECT resume_url
       FROM candidates
       WHERE id = $1
       LIMIT 1`,
      [String(id).trim()]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    return res.status(200).json({ url: result.rows[0]?.resume_url || null });
  }

  const where = [];
  const values = [];

  if (id) {
    values.push(String(id).trim());
    where.push(`id = $${values.length}`);
  }

  if (email) {
    values.push(String(email).trim().toLowerCase());
    where.push(`email = $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT *
     FROM candidates
     ${whereSql}
     ORDER BY created_at DESC`,
    values
  );

  return res.status(200).json(result.rows);
}

async function createCandidate(req, res) {
  const body = req.body || {};
  const name = toNullableString(body.name);
  const email = toNullableString(body.email)?.toLowerCase();
  const phone = normalizePhone(body.phone);
  const collegeName = toNullableString(body.college_name);
  const education = toNullableString(body.education);
  const stream = toNullableString(body.stream);
  const gender = toNullableString(body.gender);
  const cgpa = normalizeCgpa(body.cgpa);
  const resumeUrl = toNullableString(body.resume_url);
  const experience = toNullableInt(body.experience);
  const yearOfPassing = toNullableInt(body.year_of_passing);
  const relocationAvailable = toNullableBoolean(body.relocation_available);

  if (!name || !email || !resumeUrl) {
    return res.status(400).json({ error: 'name, email and resume_url are required' });
  }

  const result = await pool.query(
    `INSERT INTO candidates
     (
       name,
       email,
       phone,
       college_name,
       education,
       stream,
       gender,
       cgpa,
       resume_url,
       experience,
       year_of_passing,
       relocation_available
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      name,
      email,
      phone,
      collegeName,
      education,
      stream,
      gender,
      cgpa,
      resumeUrl,
      experience,
      yearOfPassing,
      relocationAvailable,
    ]
  );

  return res.status(200).json(result.rows[0]);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await listCandidates(req, res);
    }

    if (req.method === 'POST') {
      return await createCandidate(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Candidate with this email already exists' });
    }

    return res.status(500).json({ error: err.message });
  }
}
