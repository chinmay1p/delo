import pool from '../../lib/db.js';

function getId(rawId) {
  if (Array.isArray(rawId)) {
    return String(rawId[0] ?? '').trim();
  }
  return String(rawId ?? '').trim();
}

async function getJob(res, id) {
  const result = await pool.query(
    `SELECT *
     FROM jobs
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json(result.rows[0]);
}

async function updateJob(req, res, id) {
  const {
    title,
    description,
    jd_structured,
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
}

async function deleteJob(res, id) {
  const result = await pool.query(
    `DELETE FROM jobs
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json({ message: 'Job deleted', job: result.rows[0] });
}

export default async function handler(req, res) {
  try {
    const id = getId(req.query.id);

    if (!id) {
      return res.status(400).json({ error: 'Job id is required' });
    }

    if (req.method === 'GET') {
      return await getJob(res, id);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      return await updateJob(req, res, id);
    }

    if (req.method === 'DELETE') {
      return await deleteJob(res, id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
