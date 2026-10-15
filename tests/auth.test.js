import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, publicUser } from '../src/auth.js';

test('passwords use salted memory-hard hashing and fail closed', async () => {
  const password = 'test-only-long-password';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(first.startsWith('scrypt$32768$'));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal(await verifyPassword(password, ''), false);
  await assert.rejects(hashPassword('short'));
});

test('user responses never expose password hashes, MFA seeds or recovery codes', () => {
  const result = publicUser({ id: 'test', email: 'owner@example.com', name: 'Owner', role: 'owner', active: 1, password_hash: 'private', mfa_secret: 'private', mfa_recovery: 'private' });
  assert.equal(result.mfaEnabled, true);
  assert.equal(Object.values(result).includes('private'), false);
});