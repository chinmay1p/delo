import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = Number(req.query.id ?? req.body?.id);
    const { status } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: 'Application id is required' });
    }

    if (typeof status !== 'string' || status.trim() === '') {
      return res.status(400).json({ error: 'status is required' });
    }

    const result = await pool.query(
      `UPDATE applications
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
