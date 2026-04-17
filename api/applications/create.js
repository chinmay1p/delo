import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId, candidateId, status } = req.body ?? {};

    if (!jobId || !candidateId) {
      return res.status(400).json({ error: 'jobId and candidateId are required' });
    }

    const result = await pool.query(
      `INSERT INTO applications (job_id, candidate_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [Number(jobId), Number(candidateId), status ?? 'applied']
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
