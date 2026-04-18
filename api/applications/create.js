import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { candidate_id, job_id } = req.body;

    const result = await pool.query(
      `INSERT INTO applications (candidate_id, job_id)
       VALUES ($1, $2)
       RETURNING *`,
      [candidate_id, job_id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
