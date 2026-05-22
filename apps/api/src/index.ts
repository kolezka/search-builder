import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

// When this package is consumed as a library (e.g. bundled into the
// SvelteKit web app's SSR output) bcryptjs's built-in random() can't
// reach node's crypto via require, so genSalt silently produces garbage
// and bcrypt.hash throws "Invalid string / salt". Provide a real
// node:crypto fallback once at module load.
bcrypt.setRandomFallback((len) => Array.from(randomBytes(len)));

export { app } from './app';
export { bootstrap } from './db/bootstrap';
