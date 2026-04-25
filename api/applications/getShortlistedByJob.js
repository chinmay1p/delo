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
      `SELECT
         c.*,
         a.id AS application_id,
         a.job_id,
         a.status,
         a.stage,
         a.rule_passed,
         a.locked,
         a.created_at AS application_created_at
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       WHERE a.job_id = $1
         AND a.status = 'shortlisted'`,
      [job_id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
