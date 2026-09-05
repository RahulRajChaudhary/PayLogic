const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const { loginRateLimit } = require('../middleware/rateLimit');

const {
  loginSchema,
  hashPassword,
  comparePassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} = require('../services/auth');

const router = express.Router();

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('access_token', accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...cookieBase, maxAge: REFRESH_TOKEN_TTL_MS });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', cookieBase);
  res.clearCookie('refresh_token', cookieBase);
}

router.post('/login', loginRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password format' });
  }
  const { email, password } = parsed.data;

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ id: user.id, email: user.email, role: user.role });
});

router.post('/refresh', async (req, res) => {
  const oldToken = req.cookies?.refresh_token;
  if (!oldToken) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const result = await rotateRefreshToken(oldToken);
  if (!result) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
  const accessToken = signAccessToken({ id: result.userId, role: result.role });
  setAuthCookies(res, accessToken, result.newRawToken);
  res.json({ ok: true });
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [
    req.user.id,
  ]);
  if (!rows[0]) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(rows[0]);
});

module.exports = router;
