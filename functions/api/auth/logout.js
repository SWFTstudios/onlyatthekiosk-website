/**
 * /api/auth/logout — sign out
 *   GET  → clears the session and goes back to the home page
 *   POST → clears the session, answers { ok: true }
 */

import { json, siteOrigin, error, handleOptions, withCors } from '../../_lib/http.js';
import { destroySession } from '../../_lib/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'GET' && request.method !== 'POST') return error('Method not allowed', 405);

  let clearCookie = '';
  try { clearCookie = await destroySession(env, request); } catch (err) { console.error('auth/logout', err && err.message); }
  const headers = { 'Cache-Control': 'no-store' };
  if (clearCookie) headers['Set-Cookie'] = clearCookie;

  if (request.method === 'POST') return withCors(json({ ok: true }, 200, headers), request);
  return new Response(null, { status: 302, headers: { ...headers, Location: `${siteOrigin(request, env)}/` } });
}
