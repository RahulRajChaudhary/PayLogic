const pool = require('../db/pool');

async function listTags() {
  const { rows } = await pool.query('SELECT name FROM tags ORDER BY name');
  return rows.map((r) => r.name);
}

async function syncEmployeeTags(client, employeeId, tagNames = []) {
  const names = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];

  await client.query('DELETE FROM employee_tags WHERE employee_id = $1', [employeeId]);
  if (names.length === 0) return;

  await client.query(
    'INSERT INTO tags (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING',
    [names]
  );
  await client.query(
    `INSERT INTO employee_tags (employee_id, tag_id)
     SELECT $1, id FROM tags WHERE name = ANY($2::text[])`,
    [employeeId, names]
  );
}

module.exports = { listTags, syncEmployeeTags };
