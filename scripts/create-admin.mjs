import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { createUser } from '../src/auth.js';

const directory = path.resolve(process.env.DATA_DIR || 'data');
const store = new ContentStore(directory);
try {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your private environment.');
  if (store.db.prepare('SELECT count(*) AS total FROM users').get().total > 0 && process.env.ALLOW_ADDITIONAL_OWNER !== '1') throw new Error('An account already exists. Manage users in /admin, or explicitly set ALLOW_ADDITIONAL_OWNER=1 for recovery.');
  const user = await createUser(store, { email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME || 'Owner', password: process.env.ADMIN_PASSWORD, role: 'owner' });
  console.log(`Created owner account: ${user.email}. Remove ADMIN_PASSWORD from the environment after setup.`);
} catch (error) {
  console.error(error.name === 'ZodError' ? 'Invalid account details. Use a valid email and a password of at least 14 characters.' : error.message);
  process.exitCode = 1;
} finally { store.close(); }