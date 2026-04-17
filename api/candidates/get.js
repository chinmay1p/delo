import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id ? Number(req.query.id) : null;

    if (req.query.id && !id) {
      return res.status(400).json({ error: 'Invalid candidate id' });
    }

    if (id) {
      const result = await pool.query(
        `SELECT * FROM candidates WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    const result = await pool.query(
      `SELECT * FROM candidates ORDER BY id DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
