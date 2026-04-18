import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, resume_url } = req.body;

    if (!resume_url) {
      return res.status(400).json({ error: 'resume_url required' });
    }

    const result = await pool.query(
      `INSERT INTO candidates (name, email, phone, resume_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, phone, resume_url]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
