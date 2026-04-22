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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    if (!name || !email || !resumeUrl) {
      return res.status(400).json({ error: 'name, email and resume_url are required' });
    }

    const result = await pool.query(
      `INSERT INTO candidates 
       (name, email, phone, college_name, education, stream, gender, cgpa, resume_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
        resumeUrl
      ]
    );

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Candidate with this email already exists' });
    }

    return res.status(500).json({ error: err.message });
  }
}