/**
 * The back office (/admin.html, /api/admin/*) is for the people listed in
 * ADMIN_EMAILS (comma-separated). They sign in like any member, with an
 * emailed code; no list means nobody gets in.
 */

import { error } from './http.js';
import { accountsReady, getSession } from './session.js';

export const adminEmails = (env) => String((env && env.ADMIN_EMAILS) || '')
  .toLowerCase().split(/[\s,]+/).filter((e) => e.includes('@'));

/** → { session } for an admin, else { response } to send back. */
export async function requireAdmin(env, request) {
  if (!accountsReady(env) || !adminEmails(env).length) {
    return { response: error('The back office isn’t switched on. Set ADMIN_EMAILS.', 503) };
  }
  const session = await getSession(env, request);
  if (!session) return { response: error('Sign in required.', 401) };
  if (!adminEmails(env).includes(String(session.email).toLowerCase())) {
    return { response: error('This account can’t open the back office.', 403) };
  }
  return { session };
}
