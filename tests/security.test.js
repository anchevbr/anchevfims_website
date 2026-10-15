import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectUpload, safeUrl, can } from '../src/security.js';

test('media and external URLs reject script schemes and filesystem traversal', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,x', '//evil.test/x', '/uploads/../../server.js', '/uploads/%2e%2e/config', '/\\evil.test/x']) {
    assert.equal(safeUrl(value), '');
  }
  assert.equal(safeUrl('/uploads/film.mp4'), '/uploads/film.mp4');
  assert.equal(safeUrl('https://example.com/film'), 'https://example.com/film');
  assert.equal(safeUrl('/uploads/film.mp4', false), '');
});

test('HTML disguised as an image is rejected before publication', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-upload-'));
  try {
    const file = path.join(directory, 'image.jpg');
    await writeFile(file, '<html><script>alert(1)</script></html>');
    await assert.rejects(inspectUpload(file), { status: 415 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('permissions prevent editors and viewers from publishing or managing users', () => {
  assert.equal(can('owner', 'users'), true);
  assert.equal(can('administrator', 'users'), false);
  assert.equal(can('editor', 'publish'), false);
  assert.equal(can('viewer', 'write'), false);
  assert.equal(can('unknown', 'read'), false);
});