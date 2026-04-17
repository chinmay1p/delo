import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = Number(req.query.id ?? req.body?.id);
    const { title, description } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: 'Job id is required' });
    }

    if (typeof title !== 'string' || typeof description !== 'string') {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const result = await pool.query(
      `UPDATE jobs
       SET title = $1,
           description = $2
       WHERE id = $3
       RETURNING *`,
      [title, description, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
