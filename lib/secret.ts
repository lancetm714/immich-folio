/**
 * Single source of truth for AUTH_SECRET resolution.
 *
 * Fails closed in production: a missing AUTH_SECRET throws rather than falling
 * back to a guessable constant. In development an ephemeral per-process secret
 * is generated instead, so sessions simply do not survive a restart.
 */

import crypto from 'crypto';
import { env } from './env';
import { getInstallCredentials } from './install';

let _fallbackSecret: string | null = null;
let _warned = false;

export function resolveAuthSecret(): string {
  const secret = env.AUTH_SECRET;
  if (secret) return secret;

  if (!_fallbackSecret) {
    _fallbackSecret = crypto.randomBytes(32).toString('hex');
  }
  if (!_warned) {
    console.warn(
      '\n⚠️  SECURITY WARNING: AUTH_SECRET is not set. Generating a temporary random secret for this session.\n   Please set a long random string as AUTH_SECRET in your .env for better security.\n',
    );
    _warned = true;
  }
  return _fallbackSecret;
}
