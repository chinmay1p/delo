import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const jobId = Number(req.query.jobId ?? req.query.id);

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const result = await pool.query(
      `SELECT * FROM applications
       WHERE job_id = $1
       ORDER BY id DESC`,
      [jobId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
