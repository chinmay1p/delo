import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { job_id } = req.query;

    if (!job_id) {
      return res.status(400).json({ error: 'job_id required' });
    }

    const result = await pool.query(
      `SELECT COUNT(*)::int AS applicant_count
       FROM applications
       WHERE job_id = $1`,
      [job_id]
    );

    return res.status(200).json({
      job_id,
      applicant_count: result.rows[0]?.applicant_count ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
