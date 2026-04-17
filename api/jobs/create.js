import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description } = req.body;

    const result = await pool.query(
      `INSERT INTO jobs (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [title, description]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
