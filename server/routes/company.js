const express = require('express');
const pool = require('../db/pool');
const { companySetupSchema, hashPassword, signAccessToken, issueRefreshToken } = require('../services/auth');

const router = express.Router();

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

router.get('/status', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM company LIMIT 1');
  res.json({ exists: rows.length > 0, company: rows[0] ?? null });
});

router.post('/setup', async (req, res) => {
  const parsed = companySetupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name, address, city, state, country, adminEmail, adminPassword } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query('SELECT id FROM company LIMIT 1');
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Company already set up' });
    }

    const { rows: companyRows } = await client.query(
      `INSERT INTO company (name, address, city, state, country) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, address ?? null, city ?? null, state ?? null, country ?? null]
    );

    const passwordHash = await hashPassword(adminPassword);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'admin') RETURNING id, email, role`,
      [adminEmail, passwordHash]
    );

    await client.query('COMMIT');

    const user = userRows[0];
    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.cookie('access_token', accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ company: companyRows[0], user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
