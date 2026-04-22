import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    res.status(200).json(result.rows);

  } catch (err) {
    const message = err?.message || 'Failed to fetch jobs';
    res.status(500).json({
      error: message,
      code: err?.code || null,
    });
  }
}