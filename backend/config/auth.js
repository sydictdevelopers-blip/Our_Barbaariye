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
const TOKEN_TTL = '8h';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

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
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

module.exports = {
  COOKIE_NAME,
  signSession,
  verifySession,
  setSessionCookie,
  clearSessionCookie,
};
