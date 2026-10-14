/**
 * Shopify Customer Account API (OAuth + GraphQL).
 * Discovery: https://shopify.dev/docs/api/customer
 *
 * Env:
 *   SHOPIFY_STORE                 e.g. onlyatthekiosk.com or shop.myshopify.com
 *   SHOPIFY_CUSTOMER_CLIENT_ID
 *   SHOPIFY_CUSTOMER_CLIENT_SECRET  (confidential client)
 *   SHOPIFY_CUSTOMER_SHOP_ID        optional numeric shop id for token URL
 */

const CUSTOMER_API_VERSION = '2026-07';
const SCOPES = 'openid email customer-account-api:full';

function shopHost(env) {
  return (env.SHOPIFY_STORE || 'onlyatthekiosk.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function b64url(bytes) {
  let s;
  if (typeof bytes === 'string') {
    s = btoa(bytes);
  } else {
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    s = btoa(bin);
  }
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function randomString(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

export async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

let discoveryCache = null;
let discoveryAt = 0;

export async function discover(env) {
  const now = Date.now();
  if (discoveryCache && now - discoveryAt < 60 * 60 * 1000) return discoveryCache;

  const host = shopHost(env);
  const [oidcRes, caaRes] = await Promise.all([
    fetch(`https://${host}/.well-known/openid-configuration`),
    fetch(`https://${host}/.well-known/customer-account-api`),
  ]);
  if (!oidcRes.ok) throw new Error(`OpenID discovery failed (${oidcRes.status})`);
  if (!caaRes.ok) throw new Error(`Customer Account API discovery failed (${caaRes.status})`);
  const oidc = await oidcRes.json();
  const caa = await caaRes.json();
  discoveryCache = {
    authorization_endpoint: oidc.authorization_endpoint,
    token_endpoint: oidc.token_endpoint,
    end_session_endpoint: oidc.end_session_endpoint || oidc.logout_endpoint,
    jwks_uri: oidc.jwks_uri,
    graphql_api: caa.graphql_api || caa.graphqlApi || `https://${host}/customer/api/${CUSTOMER_API_VERSION}/graphql`,
    shop_id: String(caa.shop_id || caa.shopId || env.SHOPIFY_CUSTOMER_SHOP_ID || ''),
  };
  discoveryAt = now;
  return discoveryCache;
}

function basicAuthHeader(env) {
  const id = env.SHOPIFY_CUSTOMER_CLIENT_ID;
  const secret = env.SHOPIFY_CUSTOMER_CLIENT_SECRET || '';
  const token = btoa(`${id}:${secret}`);
  return `Basic ${token}`;
}

export async function buildAuthorizeUrl(env, {
  redirectUri,
  state,
  nonce,
  codeChallenge,
}) {
  const d = await discover(env);
  const u = new URL(d.authorization_endpoint);
  u.searchParams.set('client_id', env.SHOPIFY_CUSTOMER_CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  u.searchParams.set('code_challenge', codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export async function exchangeCode(env, { code, redirectUri, codeVerifier }) {
  const d = await discover(env);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.SHOPIFY_CUSTOMER_CLIENT_ID,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };
  if (env.SHOPIFY_CUSTOMER_CLIENT_SECRET) {
    headers.Authorization = basicAuthHeader(env);
  }
  const res = await fetch(d.token_endpoint, { method: 'POST', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `Token exchange failed (${res.status})`);
  }
  return data;
}

export async function refreshAccessToken(env, refreshToken) {
  const d = await discover(env);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.SHOPIFY_CUSTOMER_CLIENT_ID,
    refresh_token: refreshToken,
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };
  if (env.SHOPIFY_CUSTOMER_CLIENT_SECRET) {
    headers.Authorization = basicAuthHeader(env);
  }
  const res = await fetch(d.token_endpoint, { method: 'POST', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `Token refresh failed (${res.status})`);
  }
  return data;
}

export async function buildLogoutUrl(env, { idTokenHint, postLogoutRedirectUri }) {
  const d = await discover(env);
  if (!d.end_session_endpoint) return postLogoutRedirectUri;
  const u = new URL(d.end_session_endpoint);
  if (idTokenHint) u.searchParams.set('id_token_hint', idTokenHint);
  if (postLogoutRedirectUri) u.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  u.searchParams.set('client_id', env.SHOPIFY_CUSTOMER_CLIENT_ID);
  return u.toString();
}

export async function customerGraphql(env, accessToken, query, variables = {}) {
  const d = await discover(env);
  const res = await fetch(d.graphql_api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errors) {
    const msg = (data.errors && data.errors[0] && data.errors[0].message) || `Customer API ${res.status}`;
    throw new Error(msg);
  }
  return data.data;
}

const PROFILE_QUERY = `query CustomerMe {
  customer {
    id
    firstName
    lastName
    emailAddress { emailAddress }
    orders(first: 20) {
      edges {
        node {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice { amount currencyCode }
          statusPageUrl
        }
      }
    }
  }
}`;

export async function customerProfile(env, accessToken) {
  const data = await customerGraphql(env, accessToken, PROFILE_QUERY);
  const c = data && data.customer;
  if (!c) return null;
  return {
    id: c.id,
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: (c.emailAddress && c.emailAddress.emailAddress) || '',
    orders: ((c.orders && c.orders.edges) || []).map((e) => {
      const n = e.node || {};
      return {
        id: n.id,
        name: n.name,
        processedAt: n.processedAt,
        financialStatus: n.financialStatus,
        fulfillmentStatus: n.fulfillmentStatus,
        total: n.totalPrice || null,
        statusPageUrl: n.statusPageUrl || null,
      };
    }),
  };
}

export { SCOPES, CUSTOMER_API_VERSION };
