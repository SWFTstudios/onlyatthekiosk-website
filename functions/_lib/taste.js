/**
 * The onboarding ("Check-in") answers a member can save, and the one
 * function that cleans them before they reach D1. Anything not listed here
 * is dropped. Keep the option ids in sync with TASTE in js/kiosk-onboard.js.
 */

export const TASTE = {
  interests: ['cars', 'motorcycles', 'sports', 'travel', 'fashion', 'skate', 'music', 'culture', 'food', 'photo'],
  formats: ['films', 'vlogs', 'interviews', 'photo', 'reads', 'audio', 'playlists'],
  pace: ['quick', 'deep', 'both'],
  travel: ['road', 'backpack', 'city', 'work', 'homebody'],
  dream: ['tokyo', 'lisbon', 'lagos', 'reykjavik', 'mexico-city', 'seoul', 'marrakech', 'new-york', 'los-angeles', 'london', 'paris', 'cape-town', 'bali', 'rio'],
  style: ['streetwear', 'skate', 'vintage', 'minimal', 'workwear', 'outdoor', 'motorsport', 'tailored'],
  top: ['xs', 's', 'm', 'l', 'xl', 'xxl'],
  bottom: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
  fit: ['relaxed', 'true', 'fitted'],
  colors: ['black', 'bone', 'grey', 'navy', 'olive', 'brown', 'red', 'pop'],
  updates: ['drops', 'stories', 'finds', 'radio', 'events'],
};

const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');
const pick = (list, allowed, max = allowed.length) => (Array.isArray(list)
  ? Array.from(new Set(list.filter((x) => typeof x === 'string' && allowed.includes(x)))).slice(0, max)
  : []);
const one = (v, allowed) => (typeof v === 'string' && allowed.includes(v) ? v : '');
// null and '' are "no coordinate", not 0 (Number(null) is 0)
const coord = (v, lim) => (v != null && v !== '' && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= lim ? Math.round(Number(v) * 100) / 100 : null);

/** Returns a clean taste object (never throws). */
export function cleanTaste(raw) {
  const t = raw && typeof raw === 'object' ? raw : {};
  const home = t.home && typeof t.home === 'object' ? t.home : {};
  let lat = coord(home.lat, 90); let lon = coord(home.lon, 180);
  // 0,0 is the ocean off West Africa, not anyone's town: it's what a city with no
  // coordinates used to be saved as, so read it as unknown
  if (lat === 0 && lon === 0) { lat = null; lon = null; }
  const sizes = t.sizes && typeof t.sizes === 'object' ? t.sizes : {};
  const done = typeof t.completedAt === 'string' && !Number.isNaN(Date.parse(t.completedAt)) ? new Date(t.completedAt).toISOString() : '';
  return {
    v: 1,
    name: text(t.name, 40),
    interests: pick(t.interests, TASTE.interests),
    formats: pick(t.formats, TASTE.formats),
    pace: one(t.pace, TASTE.pace),
    home: text(home.city, 60) ? { city: text(home.city, 60), lat: lat != null && lon != null ? lat : null, lon: lat != null && lon != null ? lon : null } : null,
    travel: pick(t.travel, TASTE.travel),
    dream: pick(t.dream, TASTE.dream, 6),
    style: pick(t.style, TASTE.style),
    sizes: { top: one(sizes.top, TASTE.top), bottom: one(sizes.bottom, TASTE.bottom), shoe: text(sizes.shoe, 8) },
    fit: one(t.fit, TASTE.fit),
    colors: pick(t.colors, TASTE.colors),
    updates: pick(t.updates, TASTE.updates),
    completedAt: done,
  };
}

/** A member's saved answers, or null. Missing table (migration not applied) reads as null. */
export async function readProfile(env, userId) {
  let row = null;
  try {
    row = await env.DB.prepare('SELECT taste, onboarded_at, updated_at FROM profiles WHERE user_id = ?').bind(userId).first();
  } catch (err) {
    console.error('profiles table', err && err.message);
    return null;
  }
  if (!row) return null;
  let taste;
  try { taste = cleanTaste(JSON.parse(row.taste || '{}')); } catch (e) { taste = cleanTaste({}); }
  return { taste, onboardedAt: row.onboarded_at || null, updatedAt: row.updated_at };
}
