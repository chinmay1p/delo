import pool from '../../lib/db.js';

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

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};
    const shortlistedIds = extractApplicationIds(body.selectedApplicants);
    const rejectedIds = extractApplicationIds(body.rejectedApplicants);

    if (shortlistedIds.length === 0 && rejectedIds.length === 0) {
      return res.status(400).json({ error: 'No application ids provided' });
    }

    await pool.query('BEGIN');

    let shortlistedUpdated = 0;
    let rejectedUpdated = 0;

    if (shortlistedIds.length > 0) {
      const result = await pool.query(
        `UPDATE applications
         SET status = 'shortlisted'
         WHERE id = ANY($1::uuid[])`,
        [shortlistedIds]
      );
      shortlistedUpdated = result.rowCount;
    }

    if (rejectedIds.length > 0) {
      const result = await pool.query(
        `UPDATE applications
         SET status = 'rejected'
         WHERE id = ANY($1::uuid[])`,
        [rejectedIds]
      );
      rejectedUpdated = result.rowCount;
    }

    await pool.query('COMMIT');

    return res.status(200).json({
      message: 'Application statuses updated',
      shortlistedUpdated,
      rejectedUpdated,
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
}
