import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = String(req.query.id ?? '').trim();

    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }

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
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
