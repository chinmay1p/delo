import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      candidate_id,
      job_id,
      status = 'applied',
      stage = 'screening',
      rule_passed = false,
      locked = false,
    } = req.body ?? {};

    if (!candidate_id || !job_id) {
      return res.status(400).json({ error: 'candidate_id and job_id are required' });
    }

    if (typeof status !== 'string' || status.trim() === '') {
      return res.status(400).json({ error: 'status must be a non-empty string' });
    }

    if (typeof stage !== 'string' || stage.trim() === '') {
      return res.status(400).json({ error: 'stage must be a non-empty string' });
    }

    if (typeof rule_passed !== 'boolean' || typeof locked !== 'boolean') {
      return res.status(400).json({ error: 'rule_passed and locked must be boolean' });
    }

    const existing = await pool.query(
      `SELECT id FROM applications WHERE candidate_id = $1 AND job_id = $2 LIMIT 1`,
      [candidate_id, job_id]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Application already exists for this candidate and job' });
    }

    const result = await pool.query(
      `INSERT INTO applications (candidate_id, job_id, status, stage, rule_passed, locked)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [candidate_id, job_id, status.trim(), stage.trim(), rule_passed, locked]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
