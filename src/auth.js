import crypto from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import * as OTPAuth from 'otpauth';
import { can } from './security.js';

const scrypt = promisify(crypto.scrypt);
const passwordSchema = z.string().min(14, 'Use at least 14 characters.').max(128);
export const userSchema = z.object({
  email: z.email().max(254).transform((email) => email.toLowerCase()),
  name: z.string().trim().min(1).max(120),
  role: z.enum(['owner', 'administrator', 'editor', 'viewer']),
  password: passwordSchema.optional(), active: z.boolean().default(true)
});

export const hashPassword = async (password) => {
  passwordSchema.parse(password);
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt}$${digest.toString('hex')}`;
};

export const verifyPassword = async (password, stored = '') => {
  const parts = stored.split('$');
  const valid = parts.length === 6 && parts[0] === 'scrypt' && parts[1] === '32768' && /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{128}$/.test(parts[5]);
  const digest = await scrypt(String(password || '').slice(0, 128), valid ? parts[4] : '0'.repeat(32), 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return valid && crypto.timingSafeEqual(digest, Buffer.from(parts[5], 'hex'));
};

export const publicUser = (user) => user ? ({ id: user.id, email: user.email, name: user.name, role: user.role, active: Boolean(user.active), mfaEnabled: Boolean(user.mfa_secret) }) : null;
export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  if (!can(req.user.role, permission)) return res.status(403).json({ error: 'Your role does not permit this action.' });
  next();
};

export const createUser = async (store, input, actorId = null) => {
  const user = userSchema.parse(input);
  if (!user.password) throw Object.assign(new Error('A password is required.'), { status: 400 });
  const password = await hashPassword(user.password);
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  store.db.prepare('INSERT INTO users(id,email,name,password_hash,role,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, user.email, user.name, password, user.role, user.active ? 1 : 0, timestamp, timestamp);
  store.audit(actorId, 'user.create', 'user', id);
  return publicUser(store.db.prepare('SELECT * FROM users WHERE id=?').get(id));
};

class SQLiteSessionStore extends session.Store {
  constructor(database) { super(); this.db = database; }
  get(id, callback) {
    try {
      const row = this.db.prepare('SELECT data FROM sessions WHERE id=? AND expires>?').get(id, Date.now());
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) { callback(error); }
  }
  set(id, data, callback = () => {}) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
      this.db.prepare('INSERT INTO sessions(id,data,expires) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,expires=excluded.expires')
        .run(id, JSON.stringify(data), new Date(data.cookie.expires || Date.now() + 1800000).getTime());
      callback(null);
    } catch (error) { callback(error); }
  }
  destroy(id, callback = () => {}) {
    try { this.db.prepare('DELETE FROM sessions WHERE id=?').run(id); callback(null); }
    catch (error) { callback(error); }
  }
  touch(id, data, callback = () => {}) { this.set(id, data, callback); }
}

export const installAuthentication = (app, store) => {
  const production = process.env.NODE_ENV === 'production';
  const secret = process.env.SESSION_SECRET || (production ? '' : crypto.randomBytes(48).toString('hex'));
  if (secret.length < 32) throw new Error('Configure a SESSION_SECRET of at least 32 characters.');
  const mfaKey = process.env.MFA_ENCRYPTION_KEY;
  const encrypt = (value) => {
    if (!mfaKey || mfaKey.length < 32) throw Object.assign(new Error('MFA is not configured on this server.'), { status: 503 });
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(mfaKey).digest(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted.toString('hex')].join(':');
  };
  const decrypt = (value) => {
    const [iv, tag, encrypted] = value.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(mfaKey || '').digest(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]).toString('utf8');
  };
  const totp = (user, value) => new OTPAuth.TOTP({ issuer: 'Anchev Films', label: user.email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(value) });
  const verifyMfa = (user, token) => {
    user = user && store.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(user.id);
    if (!user) return false;
    if (!user.mfa_secret) return true;
    try {
      const delta = totp(user, decrypt(user.mfa_secret)).validate({ token: String(token || ''), window: 1 });
      const step = Math.floor(Date.now() / 30000) + (delta || 0);
      if (delta !== null && step > (user.mfa_last_step || 0)) {
        store.db.prepare('UPDATE users SET mfa_last_step=? WHERE id=?').run(step, user.id);
        return true;
      }
      const hash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
      const recovery = JSON.parse(user.mfa_recovery || '[]');
      const index = recovery.indexOf(hash);
      if (index < 0) return false;
      recovery.splice(index, 1);
      store.db.prepare('UPDATE users SET mfa_recovery=? WHERE id=?').run(JSON.stringify(recovery), user.id);
      return true;
    } catch { return false; }
  };
  const router = express.Router();
  router.use(session({
    name: production ? '__Secure-anchev.session' : 'anchev.session', secret,
    store: new SQLiteSessionStore(store.db), resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, secure: production, sameSite: 'strict', path: '/api/admin', maxAge: 30 * 60 * 1000 }
  }));
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    req.session.csrf ||= crypto.randomBytes(32).toString('hex');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      let sameOrigin = false;
      try { sameOrigin = Boolean(origin && new URL(origin).origin === `${req.protocol}://${req.get('host')}`); } catch {}
      const supplied = req.get('x-csrf-token') || '';
      if (!sameOrigin || !/^[a-f0-9]{64}$/.test(supplied) || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(req.session.csrf))) {
        return res.status(403).json({ error: 'Your security token expired. Reload and try again.' });
      }
    }
    if (req.session.userId && Date.now() - (req.session.authenticatedAt || 0) < 8 * 60 * 60 * 1000) {
      const user = store.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(req.session.userId);
      if (user) req.user = user;
    }
    next();
  });
  router.get('/session', (req, res) => res.json({ user: publicUser(req.user), csrf: req.session.csrf }));
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' } });
  router.post('/login', loginLimit, asyncRoute(async (req, res) => {
    const input = z.object({ email: z.email().max(254), password: z.string().max(128), token: z.string().max(64).optional() }).parse(req.body);
    const user = store.db.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE AND active=1').get(input.email);
    if (!await verifyPassword(input.password, user?.password_hash) || !verifyMfa(user, input.token)) {
      store.audit(user?.id, 'auth.failure', 'user', user?.id || '');
      return res.status(401).json({ error: 'Sign-in details or verification code are incorrect.' });
    }
    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.userId = user.id;
    req.session.authenticatedAt = Date.now();
    req.session.csrf = crypto.randomBytes(32).toString('hex');
    store.audit(user.id, 'auth.login', 'user', user.id);
    res.json({ user: publicUser(user), csrf: req.session.csrf });
  }));
  router.use(requirePermission('read'));
  router.post('/logout', asyncRoute(async (req, res) => {
    store.audit(req.user.id, 'auth.logout', 'user', req.user.id);
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie(production ? '__Secure-anchev.session' : 'anchev.session', { path: '/api/admin', httpOnly: true, sameSite: 'strict', secure: production });
    res.json({ ok: true });
  }));
  router.post('/mfa/setup', asyncRoute(async (req, res) => {
    if (!await verifyPassword(req.body.password, req.user.password_hash)) return res.status(401).json({ error: 'Password is incorrect.' });
    if (req.user.mfa_secret) return res.status(409).json({ error: 'MFA is already enabled.' });
    const value = new OTPAuth.Secret({ size: 20 }).base32;
    req.session.pendingMfa = encrypt(value);
    res.json({ secret: value, uri: totp(req.user, value).toString() });
  }));
  router.post('/mfa/confirm', asyncRoute(async (req, res) => {
    const delta = req.session.pendingMfa ? totp(req.user, decrypt(req.session.pendingMfa)).validate({ token: String(req.body.token || ''), window: 1 }) : null;
    if (delta === null) return res.status(400).json({ error: 'Verification code is incorrect.' });
    const codes = Array.from({ length: 8 }, () => crypto.randomBytes(10).toString('hex'));
    store.db.prepare('UPDATE users SET mfa_secret=?,mfa_recovery=?,mfa_last_step=? WHERE id=?')
      .run(req.session.pendingMfa, JSON.stringify(codes.map((code) => crypto.createHash('sha256').update(code).digest('hex'))), Math.floor(Date.now() / 30000) + delta, req.user.id);
    delete req.session.pendingMfa;
    store.audit(req.user.id, 'auth.mfa.enable', 'user', req.user.id);
    res.json({ recoveryCodes: codes });
  }));
  router.post('/mfa/disable', asyncRoute(async (req, res) => {
    if (!await verifyPassword(req.body.password, req.user.password_hash) || !verifyMfa(req.user, req.body.token)) return res.status(401).json({ error: 'Password or verification code is incorrect.' });
    store.db.prepare('UPDATE users SET mfa_secret=NULL,mfa_recovery=NULL,mfa_last_step=NULL WHERE id=?').run(req.user.id);
    store.audit(req.user.id, 'auth.mfa.disable', 'user', req.user.id);
    res.json({ ok: true });
  }));
  app.use('/api/admin', router);
};