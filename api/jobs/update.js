import pool from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id ?? req.body?.id;

    if (!id) {
      return res.status(400).json({ error: 'Job id is required' });
    }

    const {
      title,
      description,
      jd_structured
    } = req.body ?? {};

    const fields = [];
    const values = [];
    let index = 1;

    if (title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(title);
    }

    if (description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(description);
    }

    if (jd_structured !== undefined) {
      fields.push(`jd_structured = $${index++}`);
      values.push(jd_structured);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE jobs
       SET ${fields.join(', ')}
       WHERE id = $${index}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}