import pool from '../../lib/db.js';

function getId(rawId) {
  if (Array.isArray(rawId)) {
    return String(rawId[0] ?? '').trim();
  }
  return String(rawId ?? '').trim();
}

async function getApplication(req, res, id) {
  const includeCandidate = String(req.query.include_candidate ?? '').trim().toLowerCase() === 'true';

  if (includeCandidate) {
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
       WHERE a.id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  const result = await pool.query(
    `SELECT *
     FROM applications
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  return res.status(200).json(result.rows[0]);
}

async function updateApplication(req, res, id) {
  const {
    status,
    stage,
    rule_passed,
    locked,
  } = req.body ?? {};

  const fields = [];
  const values = [];
  let index = 1;

  if (status !== undefined) {
    if (typeof status !== 'string' || status.trim() === '') {
      return res.status(400).json({ error: 'status must be a non-empty string' });
    }
    fields.push(`status = $${index++}`);
    values.push(status.trim());
  }

  if (stage !== undefined) {
    if (typeof stage !== 'string' || stage.trim() === '') {
      return res.status(400).json({ error: 'stage must be a non-empty string' });
    }
    fields.push(`stage = $${index++}`);
    values.push(stage.trim());
  }

  if (rule_passed !== undefined) {
    if (typeof rule_passed !== 'boolean') {
      return res.status(400).json({ error: 'rule_passed must be boolean' });
    }
    fields.push(`rule_passed = $${index++}`);
    values.push(rule_passed);
  }

  if (locked !== undefined) {
    if (typeof locked !== 'boolean') {
      return res.status(400).json({ error: 'locked must be boolean' });
    }
    fields.push(`locked = $${index++}`);
    values.push(locked);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE applications
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING *`,
    values
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  return res.status(200).json(result.rows[0]);
}

async function deleteApplication(res, id) {
  const result = await pool.query(
    `DELETE FROM applications
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  return res.status(200).json({ message: 'Application deleted', application: result.rows[0] });
}

export default async function handler(req, res) {
  try {
    const id = getId(req.query.id);

    if (!id) {
      return res.status(400).json({ error: 'Application id is required' });
    }

    if (req.method === 'GET') {
      return await getApplication(req, res, id);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      return await updateApplication(req, res, id);
    }

    if (req.method === 'DELETE') {
      return await deleteApplication(res, id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
