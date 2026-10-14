/**
 * /api/wishlist
 * GET                — list items
 * POST { kind, ref } — add one
 * POST { action: 'merge', items: [{kind,ref}] } — merge local saves
 * DELETE { kind, ref } or ?kind=&ref=
 */

import {
  json,
  error,
  handleOptions,
  withCors,
} from '../_lib/http.js';
import { requireSession } from '../_lib/session.js';

function normalizeKind(kind) {
  return kind === 'product' || kind === 'story' ? kind : null;
}

function normalizeRef(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const v = ref.trim().slice(0, 120);
  return v || null;
}

async function listWishlist(env, userId) {
  const rows = await env.DB.prepare(
    `SELECT kind, ref, created_at FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(userId).all();
  return (rows.results || []).map((r) => ({
    kind: r.kind,
    ref: r.ref,
    createdAt: r.created_at,
  }));
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return handleOptions(request);

  const { session, response } = await requireSession(env, request);
  if (response) return withCors(response, request);

  try {
    if (request.method === 'GET') {
      return withCors(json({ items: await listWishlist(env, session.userId) }), request);
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));

      if (body.action === 'merge' && Array.isArray(body.items)) {
        const stmt = env.DB.prepare(
          `INSERT OR IGNORE INTO wishlist_items (user_id, kind, ref) VALUES (?, ?, ?)`
        );
        const batch = [];
        for (const item of body.items.slice(0, 200)) {
          const kind = normalizeKind(item.kind);
          const ref = normalizeRef(item.ref);
          if (kind && ref) batch.push(stmt.bind(session.userId, kind, ref));
        }
        if (batch.length) await env.DB.batch(batch);
        return withCors(json({ items: await listWishlist(env, session.userId) }), request);
      }

      const kind = normalizeKind(body.kind);
      const ref = normalizeRef(body.ref);
      if (!kind || !ref) {
        return withCors(error('kind (story|product) and ref are required.'), request);
      }
      await env.DB.prepare(
        `INSERT OR IGNORE INTO wishlist_items (user_id, kind, ref) VALUES (?, ?, ?)`
      ).bind(session.userId, kind, ref).run();
      return withCors(json({ items: await listWishlist(env, session.userId) }), request);
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      let kind = normalizeKind(url.searchParams.get('kind'));
      let ref = normalizeRef(url.searchParams.get('ref'));
      if (!kind || !ref) {
        const body = await request.json().catch(() => ({}));
        kind = normalizeKind(body.kind);
        ref = normalizeRef(body.ref);
      }
      if (!kind || !ref) {
        return withCors(error('kind and ref are required.'), request);
      }
      await env.DB.prepare(
        `DELETE FROM wishlist_items WHERE user_id = ? AND kind = ? AND ref = ?`
      ).bind(session.userId, kind, ref).run();
      return withCors(json({ items: await listWishlist(env, session.userId) }), request);
    }

    return withCors(error('Method not allowed', 405), request);
  } catch (err) {
    console.error('api/wishlist', err && err.message);
    return withCors(error('Wishlist update failed.', 500), request);
  }
}
