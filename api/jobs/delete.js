import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id ?? req.body?.id;

    if (!id) {
      return res.status(400).json({ error: 'Job id is required' });
    }

    const result = await pool.query(
      `DELETE FROM jobs WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json({ message: 'Job deleted', job: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
