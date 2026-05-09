/**
 * auth.js — JWT session helpers (PR 1: foundation only, no enforcement yet)
 *
 * Issues a signed JWT in an HttpOnly cookie at login. Endpoints do NOT yet
 * verify it — that arrives in PR 2 (requireAuth middleware). For now the
 * cookie just rides alongside the existing localStorage flow.
 *
 * Env: JWT_SECRET must be set (≥ 32 chars). In production we throw if missing
 * so the server refuses to boot rather than silently issuing weak tokens.
 */
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'session';
const TOKEN_TTL = '30m';
const COOKIE_MAX_AGE_MS = 30 * 60 * 1000;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is missing or too short (need ≥ 32 chars)');
    }
    // Dev fallback — loud warning, deterministic so restarts don't invalidate cookies mid-session
    if (!global.__JWT_DEV_WARNED) {
      console.warn('[auth] ⚠ JWT_SECRET not set — using dev fallback. SET JWT_SECRET in .env before deploying.');
      global.__JWT_DEV_WARNED = true;
    }
    return 'dev-only-do-not-use-in-production-0123456789abcdef';
  }
  return secret;
}

function signSession(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

function verifySession(token) {
  return jwt.verify(token, getSecret());
}

function cookieOptions() {
  // Default: secure cookies in production. Override with COOKIE_SECURE=false
  // when serving the frontend over plain HTTP (browser refuses to store a
  // `secure` cookie on an http:// origin, which silently breaks login).
  const secure = process.env.COOKIE_SECURE != null
    ? String(process.env.COOKIE_SECURE).toLowerCase() === 'true'
    : process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

function setSessionCookie(res, payload) {
  const token = signSession(payload);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Sliding expiration: when the current token has less than this many seconds
// left, requireAuth re-signs and resets the cookie. Picking half the TTL
// avoids re-issuing on every single request (signing is cheap but Set-Cookie
// on every response is noisy in dev tools and wastes a few CPU cycles), while
// still giving an actively-working user effectively-infinite session.
const REFRESH_WHEN_REMAINING_SEC = 15 * 60; // refresh once token has < 15 min left

/**
 * requireAuth — Express middleware. Verifies the session cookie and attaches
 * the decoded payload to req.user. Sends 401 on missing/invalid token. The
 * server-side br_id / u_br_id / usr_id come from req.user only — never trust
 * client-supplied body fields for these.
 *
 * Sliding window: any authenticated request that lands while the token is in
 * its second half of life triggers a re-sign with a fresh 30-min expiry. As
 * long as the user is doing something every 30 min the session never times
 * out; idle past 30 min and the next request returns 401.
 */
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No session', code: 'NO_SESSION' });
  }
  try {
    const payload = verifySession(token);
    req.user = payload;

    // Slide the window if we're past the refresh threshold. Strip JWT's own
    // metadata (iat/exp/nbf) before re-signing so jsonwebtoken doesn't reject
    // the duplicated `exp` claim.
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = (payload.exp || 0) - nowSec;
    if (remaining > 0 && remaining < REFRESH_WHEN_REMAINING_SEC) {
      const { iat, exp, nbf, ...claims } = payload;
      void iat; void exp; void nbf;
      setSessionCookie(res, claims);
    }
    return next();
  } catch (err) {
    // Invalid / expired → clear so the client stops sending it
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Invalid session', code: 'INVALID_SESSION' });
  }
}

module.exports = {
  COOKIE_NAME,
  signSession,
  verifySession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
};
