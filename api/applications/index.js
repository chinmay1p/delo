import pool from '../../lib/db.js';

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function extractApplicationIds(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const ids = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      ids.push(item.trim());
      continue;
    }

    if (item && typeof item === 'object') {
      const id = item.application_id ?? item.id;
      if (typeof id === 'string' && id.trim()) {
        ids.push(id.trim());
      }
    }
  }

  return [...new Set(ids)];
}

function buildBulkUpdates(body) {
  const updates = [];

  if (Array.isArray(body?.updates)) {
    for (const item of body.updates) {
      const id = String(item?.id ?? '').trim();
      const status = String(item?.status ?? '').trim();
      if (id && status) {
        updates.push({ id, status });
      }
    }
  }

  const selectedApplicants = extractApplicationIds(body?.selectedApplicants);
  for (const id of selectedApplicants) {
    updates.push({ id, status: 'shortlisted' });
  }

  const rejectedApplicants = extractApplicationIds(body?.rejectedApplicants);
  for (const id of rejectedApplicants) {
    updates.push({ id, status: 'rejected' });
  }

  const sharedStatus = String(body?.status ?? '').trim();
  if (sharedStatus) {
    const applicationIds = extractApplicationIds(body?.application_ids ?? body?.applicationIds);
    for (const id of applicationIds) {
      updates.push({ id, status: sharedStatus });
    }
  }

  const dedup = new Map();
  for (const item of updates) {
    dedup.set(item.id, item.status);
  }

  return [...dedup.entries()].map(([id, status]) => ({ id, status }));
}

async function listApplications(req, res) {
  const { job_id, status } = req.query;
  const includeCandidates = toBool(req.query.include_candidates, true);
  const countOnly = toBool(req.query.count_only, false);
  const includeCount = toBool(req.query.include_count, false);

  const where = [];
  const params = [];

  if (job_id) {
    params.push(job_id);
    where.push(`a.job_id = $${params.length}`);
  }

  if (status) {
    params.push(String(status).trim());
    where.push(`a.status = $${params.length}`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (countOnly) {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS applicant_count
       FROM applications a
       ${whereSql}`,
      params
    );

    return res.status(200).json({
      job_id: job_id ?? null,
      status: status ?? null,
      applicant_count: countResult.rows[0]?.applicant_count ?? 0,
    });
  }

  const result = includeCandidates
    ? await pool.query(
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
         ${whereSql}
         ORDER BY a.created_at DESC`,
        params
      )
    : await pool.query(
        `SELECT a.*
         FROM applications a
         ${whereSql}
         ORDER BY a.created_at DESC`,
        params
      );

  if (!includeCount) {
    return res.status(200).json(result.rows);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS applicant_count
     FROM applications a
     ${whereSql}`,
    params
  );

  return res.status(200).json({
    applicant_count: countResult.rows[0]?.applicant_count ?? 0,
    items: result.rows,
  });
}

async function createApplication(req, res) {
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

  return res.status(200).json(result.rows[0]);
}

async function bulkUpdateApplications(req, res) {
  const updates = buildBulkUpdates(req.body ?? {});

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  await pool.query('BEGIN');

  const updated = [];
  for (const item of updates) {
    const result = await pool.query(
      `UPDATE applications
       SET status = $1
       WHERE id = $2
       RETURNING id, status`,
      [item.status, item.id]
    );

    if (result.rowCount > 0) {
      updated.push(result.rows[0]);
    }
  }

  await pool.query('COMMIT');

  const countsByStatus = {};
  for (const item of updated) {
    countsByStatus[item.status] = (countsByStatus[item.status] ?? 0) + 1;
  }

  return res.status(200).json({
    message: 'Applications updated',
    updatedCount: updated.length,
    countsByStatus,
    updated,
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await listApplications(req, res);
    }

    if (req.method === 'POST') {
      return await createApplication(req, res);
    }

    if (req.method === 'PATCH') {
      return await bulkUpdateApplications(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}
