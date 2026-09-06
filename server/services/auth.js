const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db/pool');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signAccessToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function issueRefreshToken(userId) {
  const rawToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(rawToken), expiresAt]
  );
  return rawToken;
}


async function rotateRefreshToken(rawToken) {
  try {
    jwt.verify(rawToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return null; 
  }

  const tokenHash = hashToken(rawToken);
  const { rows } = await pool.query(
    `SELECT rt.id, rt.user_id, rt.revoked_at, rt.expires_at, u.role
     FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) {
    return null; 
  }
  if (row.revoked_at) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id]
    );
    return null;
  }
  if (new Date(row.expires_at) < new Date()) {
    return null; // naturally expired - not suspicious, just reject
  }
  await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [row.id]);
  const newRawToken = await issueRefreshToken(row.user_id);
  return { newRawToken, userId: row.user_id, role: row.role };
}

async function revokeRefreshToken(rawToken) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(rawToken)]
  );
}

module.exports = {
  loginSchema,
  hashPassword,
  comparePassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  REFRESH_TOKEN_TTL_MS,
};
