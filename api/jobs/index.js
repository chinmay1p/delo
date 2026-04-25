import pool from '../../lib/db.js';

async function listJobs(req, res) {
  const { has_jd } = req.query;

  let query = `
    SELECT *
    FROM jobs
  `;

  if (has_jd === 'true') {
    query += `
      WHERE jd_structured IS NOT NULL
      AND jd_structured::text NOT IN ('{}', '[]')
    `;
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query);

  return res.status(200).json(result.rows);
}

async function createJob(req, res) {
  const { title, description } = req.body ?? {};

  const result = await pool.query(
    `INSERT INTO jobs (title, description)
     VALUES ($1, $2)
     RETURNING *`,
    [title, description]
  );

  return res.status(200).json(result.rows[0]);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await listJobs(req, res);
    }

    if (req.method === 'POST') {
      return await createJob(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const message = err?.message || 'Failed to process jobs request';
    return res.status(500).json({
      error: message,
      code: err?.code || null,
    });
  }
}
