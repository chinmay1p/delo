import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM jobs ORDER BY created_at DESC`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    const message = err?.message || 'Failed to fetch jobs';
    res.status(500).json({
      error: message,
      code: err?.code || null,
    });
  }
}
