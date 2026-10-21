/* Unit checks for functions/_lib/spotify.js (no network, no secrets). */
import { pkcePair, randomState, encryptText, decryptText, normalizeTrack, SPOTIFY_SCOPES, spotifyConfigured } from '../functions/_lib/spotify.js';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass += 1; console.log(`  ok  ${name}`); } else { fail += 1; console.log(`  FAIL ${name}`); } };

const env = { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', AUTH_SECRET: 'test-secret' };
ok('configured with id+secret', spotifyConfigured(env) === true);
ok('not configured without secret', spotifyConfigured({ SPOTIFY_CLIENT_ID: 'id' }) === false);
ok('scopes include streaming + library', SPOTIFY_SCOPES.includes('streaming') && SPOTIFY_SCOPES.includes('user-library-read'));
ok('states differ', randomState() !== randomState());

const { verifier, challenge } = await pkcePair();
ok('pkce verifier present', verifier.length > 40);
ok('pkce challenge is not verifier', challenge !== verifier && challenge.length > 40);
const pair2 = await pkcePair();
ok('pkce pairs differ', pair2.verifier !== verifier);

const enc = await encryptText(env, 'refresh-token-123');
ok('encrypt hides plaintext', !!enc && !enc.includes('refresh-token-123'));
ok('decrypt round-trips', (await decryptText(env, enc)) === 'refresh-token-123');
ok('decrypt rejects other key', (await decryptText({ AUTH_SECRET: 'other' }, enc)) === null);
ok('encrypt refuses without key', (await encryptText({}, 'x')) === null);

const t = normalizeTrack({ id: 'abc', name: 'Song', artists: [{ name: 'A' }, { name: 'B' }], album: { name: 'LP', images: [{ url: 'big', width: 640 }, { url: 'mid', width: 300 }] }, duration_ms: 1000, explicit: true });
ok('track normalised', t.title === 'Song' && t.artist === 'A, B' && t.uri === 'spotify:track:abc' && t.cover === 'mid');
ok('bad track refused', normalizeTrack(null) === null && normalizeTrack({}) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
