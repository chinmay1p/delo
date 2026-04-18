import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const { job_id } = req.query;

    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.resume_url,
              a.status, a.stage
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       WHERE a.job_id = $1`,
      [job_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
