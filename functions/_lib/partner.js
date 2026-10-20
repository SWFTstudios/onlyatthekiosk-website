/**
 * Partner Hub: the fields a partner can save and the functions that clean
 * them before they reach D1 (tables in migrations/0003_partners.sql).
 * Anything not listed here is dropped; links must be https.
 */

export const KINDS = ['store', 'brand', 'sponsor'];
export const PAYOUTS = ['collective', 'link', 'marketplace', 'sponsor'];
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
export const MAX_PRODUCTS = 60;

const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').trim().slice(0, max) : '');
const line = (v, max) => text(v, max).replace(/\s+/g, ' ');
const one = (v, allowed, fallback = '') => (typeof v === 'string' && allowed.includes(v) ? v : fallback);

/** An https URL (or '' when empty / anything else). */
export function safeUrl(v, max = 400) {
  const s = line(v, max);
  if (!s) return '';
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' && u.hostname.includes('.') ? u.href.slice(0, max) : '';
  } catch (e) { return ''; }
}

/** A URL-safe handle: lower-case letters, digits and single dashes, 3–40 long. */
export function handleOf(v) {
  const h = String(v || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return h.length >= 3 ? h : '';
}

const instagramOf = (v) => {
  const s = line(v, 120).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  return /^[a-z0-9._]{1,30}$/i.test(s) ? s : '';
};

/** Partner settings: who to contact, whether to be listed, notices and how payouts work. */
export function cleanSettings(raw, fallbackEmail = '') {
  const s = raw && typeof raw === 'object' ? raw : {};
  const email = line(s.contactEmail, 254).toLowerCase();
  return {
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : fallbackEmail,
    listed: s.listed !== false,
    notifyMessages: s.notifyMessages !== false,
    notifyOrders: s.notifyOrders !== false,
    payout: one(s.payout, PAYOUTS, 'link'),
  };
}

/**
 * A clean partner profile, or { error } naming the first problem.
 * `name` and `kind` are required; the handle falls back to the name.
 */
export function cleanPartner(raw, fallbackEmail = '') {
  const p = raw && typeof raw === 'object' ? raw : {};
  const name = line(p.name, 80);
  const kind = one(p.kind, KINDS);
  if (!name) return { error: 'Add your store, brand or company name.' };
  if (!kind) return { error: 'Choose store, brand or sponsor.' };
  const handle = handleOf(p.handle) || handleOf(name);
  if (!handle) return { error: 'Your handle needs at least three letters or numbers.' };
  return {
    handle,
    kind,
    name,
    tagline: line(p.tagline, 120),
    bio: text(p.bio, 2000).replace(/\n{3,}/g, '\n\n'),
    city: line(p.city, 60),
    country: line(p.country, 60),
    website: safeUrl(p.website),
    instagram: instagramOf(p.instagram),
    logo: safeUrl(p.logo),
    cover: safeUrl(p.cover),
    settings: cleanSettings(p.settings, fallbackEmail),
  };
}

/** A clean product, or { error }. */
export function cleanProduct(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const title = line(p.title, 120);
  if (!title) return { error: 'Give the piece a name.' };
  const n = p.price === '' || p.price == null ? null : Number(p.price);
  if (n != null && !(Number.isFinite(n) && n >= 0 && n < 1e6)) return { error: 'Price must be a number.' };
  return {
    title,
    description: text(p.description, 1200),
    price: n == null ? null : Math.round(n * 100) / 100,
    currency: one(String(p.currency || '').toUpperCase(), CURRENCIES, 'USD'),
    url: safeUrl(p.url),
    image: safeUrl(p.image),
    status: one(p.status, ['draft', 'live'], 'draft'),
  };
}

const parse = (s) => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };

/** Row → API shape (the owner's view). */
export function partnerOut(row) {
  if (!row) return null;
  return {
    handle: row.handle, kind: row.kind, name: row.name, tagline: row.tagline, bio: row.bio,
    city: row.city, country: row.country, website: row.website, instagram: row.instagram,
    logo: row.logo, cover: row.cover, settings: parse(row.settings), status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
export function productOut(row) {
  return {
    id: row.id, title: row.title, description: row.description, price: row.price, currency: row.currency,
    url: row.url, image: row.image, status: row.status, sort: row.sort, updatedAt: row.updated_at,
  };
}

export async function readPartner(env, userId) {
  const [p, list] = await Promise.all([
    env.DB.prepare('SELECT * FROM partners WHERE user_id = ?').bind(userId).first(),
    env.DB.prepare('SELECT * FROM partner_products WHERE user_id = ? ORDER BY sort, created_at').bind(userId).all(),
  ]);
  return { partner: partnerOut(p), products: p ? (list.results || []).map(productOut) : [] };
}
