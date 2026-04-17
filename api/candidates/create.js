import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, resumeUrl } = req.body ?? {};

    if (typeof name !== 'string' || typeof email !== 'string') {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const result = await pool.query(
      `INSERT INTO candidates (name, email, resume_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, resumeUrl ?? null]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
