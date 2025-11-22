# Shopify Storefront API Reference Guide

**Official Documentation**: [https://shopify.dev/docs/api/storefront/latest](https://shopify.dev/docs/api/storefront/latest)

**Last Updated**: Based on Storefront API version 2025-10 (latest)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [GraphQL Queries](#graphql-queries)
5. [Rate Limits](#rate-limits)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Store Setup Checklist](#store-setup-checklist)
9. [Common Queries Reference](#common-queries-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Shopify Storefront API is a GraphQL API that allows you to create custom storefronts on any platform (web, mobile apps, games). It provides full commerce functionality including:

- ✅ View products and collections
- ✅ Add products to cart
- ✅ Checkout
- ✅ Customer management (with token)
- ✅ Metaobjects and metafields (with token)
- ✅ Search functionality
- ✅ Pages, blogs, and articles

**Key Features:**
- GraphQL-based (single endpoint for all queries)
- Tokenless access available for basic features
- Token-based access for advanced features
- Rate limits: 2,000 points per second (token-based), 1,000 complexity (tokenless)

**Official Documentation**: [Storefront API Overview](https://shopify.dev/docs/api/storefront/latest)

---

## Authentication

### Tokenless Access

**When to Use**: For basic product browsing, collections, search, and cart operations.

**Features Available:**
- Products and Collections
- Selling Plans
- Search
- Pages, Blogs, and Articles
- Cart (read/write)

**Limitations:**
- Query complexity limit: 1,000
- No access to: Product Tags, Metaobjects, Metafields, Menu, Customers

**Example Request:**
```bash
curl -X POST \
https://onlyatthekiosk.com/api/2025-10/graphql.json \
-H 'Content-Type: application/json' \
-d '{
  "query": "{
    products(first: 3) {
      edges {
        node {
          id
          title
        }
      }
    }
  }"
}'
```

**Official Docs**: [Tokenless Access](https://shopify.dev/docs/api/storefront/latest/queries/products)

---

### Token-Based Authentication

**When to Use**: For full API access including metafields, customer data, and advanced features.

**Types of Access:**
1. **Public Access**: For browser/mobile app queries
2. **Private Access**: For server-side queries (like our Cloudflare Pages Functions)

**Features Requiring Token:**
- Product Tags
- Metaobjects and Metafields
- Menu (Online Store navigation)
- Customers

**Example Request:**
```bash
curl -X POST \
https://onlyatthekiosk.com/api/2025-10/graphql.json \
-H 'Content-Type: application/json' \
-H 'X-Shopify-Storefront-Access-Token: {storefront-access-token}' \
-d '{
  "query": "{your_query}"
}'
```

**Official Docs**: [Token-Based Authentication](https://shopify.dev/docs/api/storefront/latest/authentication)

---

## API Endpoints

### Base URL Structure

```
https://{shop-domain}/api/{api-version}/graphql.json
```

**For Only at The Kiosk:**
```
https://onlyatthekiosk.com/api/2025-10/graphql.json
```

**API Versions:**
- `2025-10` (latest)
- `2025-07`
- `2025-04`
- `2025-01`
- `2024-10` (deprecated)
- `2024-01` (deprecated - currently using)

**Note**: We're currently using `2024-01` but should migrate to `2025-10` for latest features.

**Official Docs**: [Endpoints and Queries](https://shopify.dev/docs/api/storefront/latest/queries)

---

## GraphQL Queries

### Query Structure

All Storefront API requests use GraphQL:

```graphql
query {
  products(first: 10) {
    edges {
      node {
        id
        title
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}
```

### Common Query Types

#### 1. Products Query

**Fetch all products:**
```graphql
query getProducts($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        handle
        description
        descriptionHtml
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
              availableForSale
            }
          }
        }
      }
    }
  }
}
```

**Official Docs**: [Products Query](https://shopify.dev/docs/api/storefront/latest/queries/products)

#### 2. Product by Handle

**Fetch single product:**
```graphql
query getProductByHandle($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    description
    descriptionHtml
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 10) {
      edges {
        node {
          url
          altText
        }
      }
    }
    variants(first: 10) {
      edges {
        node {
          id
          title
          price {
            amount
            currencyCode
          }
          availableForSale
        }
      }
    }
    metafields(identifiers: [
      {namespace: "descriptors", key: "care_guide"}
    ]) {
      namespace
      key
      value
      type
    }
  }
}
```

**Official Docs**: [Product Query](https://shopify.dev/docs/api/storefront/latest/queries/product)

#### 3. Collections Query

**Fetch all collections:**
```graphql
query getCollections($first: Int!) {
  collections(first: $first) {
    edges {
      node {
        id
        title
        handle
        description
        image {
          url
          altText
        }
      }
    }
  }
}
```

**Official Docs**: [Collections Query](https://shopify.dev/docs/api/storefront/latest/queries/collections)

#### 4. Collection Products

**Fetch products in a collection:**
```graphql
query getCollectionProducts($handle: String!, $first: Int!) {
  collection(handle: $handle) {
    id
    title
    description
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
}
```

**Official Docs**: [Collection Query](https://shopify.dev/docs/api/storefront/latest/queries/collection)

#### 5. Cart Operations

**Create cart:**
```graphql
mutation cartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      id
      checkoutUrl
    }
    userErrors {
      field
      message
    }
  }
}
```

**Add to cart:**
```graphql
mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      lines(first: 10) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

**Official Docs**: [Cart Mutations](https://shopify.dev/docs/api/storefront/latest/mutations/cartcreate)

---

## Rate Limits

### Token-Based Access

**Limit**: 2,000 points per second

**How it works:**
- Each query has a cost (points)
- Points are calculated based on query complexity
- Rate limit is per access token
- Exceeding limit returns `THROTTLED` error

**Example Error:**
```json
{
  "errors": [
    {
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED"
      }
    }
  ]
}
```

**Best Practices:**
- Cache responses when possible
- Batch queries when appropriate
- Implement retry logic with exponential backoff
- Monitor rate limit usage

**Official Docs**: [Rate Limits](https://shopify.dev/docs/api/storefront/latest/rate-limits)

### Tokenless Access

**Limit**: 1,000 query complexity points

**How it works:**
- Query complexity calculated based on field costs
- Same calculation as GraphQL Admin API
- Exceeding limit returns `MAX_COMPLEXITY_EXCEEDED` error

**Example Error:**
```json
{
  "errors": [
    {
      "message": "Complexity exceeded",
      "extensions": {
        "code": "MAX_COMPLEXITY_EXCEEDED",
        "cost": 1250,
        "maxCost": 1000
      }
    }
  ]
}
```

**Official Docs**: [Query Complexity Limit](https://shopify.dev/docs/api/storefront/latest/rate-limits#query-complexity-limit-for-tokenless-access)

---

## Error Handling

### HTTP Status Codes

The Storefront API can return `200 OK` even for errors. Always check the `errors` array in the response.

#### 200 OK (with errors)

Many errors return HTTP 200 with an errors object:

```json
{
  "errors": [
    {
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED"
      }
    }
  ]
}
```

#### 4xx and 5xx Status Codes

**400 Bad Request**: Invalid query or parameters
**402 Payment Required**: Shop is frozen (unpaid balance)
**403 Forbidden**: Shop marked as fraudulent
**404 Not Found**: Resource doesn't exist
**423 Locked**: Shop unavailable (rate limit exceeded or fraud risk)
**5xx Errors**: Internal Shopify errors

**Official Docs**: [Status and Error Codes](https://shopify.dev/docs/api/storefront/latest/status-and-error-codes)

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `THROTTLED` | Rate limit exceeded | Wait and retry, implement backoff |
| `MAX_COMPLEXITY_EXCEEDED` | Query too complex (tokenless) | Simplify query or use token |
| `ACCESS_DENIED` | Invalid or missing token | Check token configuration |
| `SHOP_INACTIVE` | Shop not active | Contact Shopify support |
| `INTERNAL_SERVER_ERROR` | Shopify internal error | Retry request, check status page |

### Error Response Structure

```json
{
  "errors": [
    {
      "message": "Error description",
      "extensions": {
        "code": "ERROR_CODE",
        "cost": 1250,
        "maxCost": 1000
      }
    }
  ]
}
```

**For Mutations**, also check `userErrors`:
```json
{
  "data": {
    "cartCreate": {
      "cart": null,
      "userErrors": [
        {
          "field": ["input", "lines", 0, "merchandiseId"],
          "message": "Merchandise not found"
        }
      ]
    }
  }
}
```

**Official Docs**: [Error Handling](https://shopify.dev/docs/api/storefront/latest/status-and-error-codes#error-handling)

---

## Best Practices

### 1. Query Optimization

**Do:**
- Request only fields you need
- Use pagination (`first`, `after`) for large datasets
- Cache responses when appropriate
- Batch related queries when possible

**Don't:**
- Request all fields "just in case"
- Fetch more products than needed
- Make redundant API calls

### 2. Error Handling

**Always:**
- Check for `errors` array in response
- Check for `userErrors` in mutations
- Implement retry logic for transient errors
- Log errors for debugging

**Example:**
```javascript
try {
  const response = await fetch('/api/shopify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  
  const data = await response.json();
  
  if (data.errors) {
    // Handle GraphQL errors
    console.error('GraphQL errors:', data.errors);
    throw new Error(data.errors[0].message);
  }
  
  if (data.data?.cartCreate?.userErrors?.length > 0) {
    // Handle mutation user errors
    console.error('User errors:', data.data.cartCreate.userErrors);
    throw new Error(data.data.cartCreate.userErrors[0].message);
  }
  
  return data.data;
} catch (error) {
  console.error('API request failed:', error);
  throw error;
}
```

### 3. Rate Limit Management

**Strategies:**
- Implement request queuing
- Use exponential backoff for retries
- Cache frequently accessed data
- Monitor rate limit usage

**Example Retry Logic:**
```javascript
async function queryWithRetry(query, variables, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      
      const data = await response.json();
      
      if (data.errors?.[0]?.extensions?.code === 'THROTTLED') {
        // Wait with exponential backoff
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 4. Security

**Always:**
- Keep access tokens server-side (use Cloudflare Pages Functions)
- Never expose tokens in client-side code
- Use HTTPS for all API requests
- Validate and sanitize user input

**Our Implementation:**
- Tokens stored in Cloudflare Pages environment variables
- API calls proxied through `/api/shopify` function
- CORS headers configured correctly

**Official Docs**: [Authentication](https://shopify.dev/docs/api/storefront/latest/authentication)

---

## Store Setup Checklist

### ✅ Required Setup

- [ ] **Storefront API App Created**
  - Go to Shopify Admin → Settings → Apps and sales channels
  - Click "Develop apps" → Create app
  - Enable Storefront API access
  - Generate Storefront API access token
  - Store token in Cloudflare Pages environment variables

- [ ] **Environment Variables Configured**
  - `SHOPIFY_STOREFRONT_TOKEN` - Storefront API access token
  - `SHOPIFY_STORE_DOMAIN` - Store domain (e.g., `onlyatthekiosk.com`)
  - `SHOPIFY_API_VERSION` - API version (e.g., `2025-10`)

- [ ] **Products Imported**
  - Use `kiosk-shopify-products.csv` for bulk import
  - Verify all products have images
  - Verify metafields are set correctly

- [ ] **Collections Created**
  - Main collections: Bracelets, Chains, Hoodies, T-Shirts
  - Sub-collections: Gold Bracelets, Silver Bracelets, etc.
  - Verify collection handles match code (lowercase, hyphens)

- [ ] **Metafields Configured**
  - Namespace: `descriptors`
  - Key: `care_guide`
  - Type: Multi-line text
  - Visibility: Storefront API enabled

- [ ] **API Endpoint Verified**
  - Test endpoint: `https://onlyatthekiosk.com/api/2025-10/graphql.json`
  - Verify token works with test query
  - Check rate limits are acceptable

### ✅ Recommended Setup

- [ ] **API Version Updated**
  - Currently using: `2024-01`
  - Recommended: `2025-10` (latest)
  - Update in `js/shopify.js` and `functions/api/shopify.js`

- [ ] **Error Monitoring**
  - Set up error logging
  - Monitor rate limit usage
  - Track API response times

- [ ] **Caching Strategy**
  - Cache product data when appropriate
  - Cache collection data
  - Implement cache invalidation

- [ ] **Performance Optimization**
  - Optimize GraphQL queries
  - Use pagination for large datasets
  - Lazy load product images

**Official Docs**: [Getting Started](https://shopify.dev/docs/api/storefront/latest)

---

## Common Queries Reference

### Products

**Get all products:**
```graphql
query {
  products(first: 20) {
    edges {
      node {
        id
        title
        handle
      }
    }
  }
}
```

**Get product by handle:**
```graphql
query {
  product(handle: "001-gold-chain") {
    id
    title
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
}
```

**Official Docs**: [Products](https://shopify.dev/docs/api/storefront/latest/queries/products)

### Collections

**Get all collections:**
```graphql
query {
  collections(first: 10) {
    edges {
      node {
        id
        title
        handle
      }
    }
  }
}
```

**Get collection by handle:**
```graphql
query {
  collection(handle: "bracelets") {
    id
    title
    products(first: 20) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
}
```

**Official Docs**: [Collections](https://shopify.dev/docs/api/storefront/latest/queries/collections)

### Cart

**Create cart:**
```graphql
mutation {
  cartCreate(input: {
    lines: [
      {
        merchandiseId: "gid://shopify/ProductVariant/123456"
        quantity: 1
      }
    ]
  }) {
    cart {
      id
      checkoutUrl
    }
  }
}
```

**Add to cart:**
```graphql
mutation {
  cartLinesAdd(
    cartId: "gid://shopify/Cart/abc123"
    lines: [
      {
        merchandiseId: "gid://shopify/ProductVariant/123456"
        quantity: 1
      }
    ]
  ) {
    cart {
      id
      totalQuantity
    }
  }
}
```

**Official Docs**: [Cart](https://shopify.dev/docs/api/storefront/latest/mutations/cartcreate)

### Metafields

**Get product metafields:**
```graphql
query {
  product(handle: "001-gold-chain") {
    metafields(identifiers: [
      {namespace: "descriptors", key: "care_guide"}
    ]) {
      namespace
      key
      value
      type
    }
  }
}
```

**Official Docs**: [Metafields](https://shopify.dev/docs/api/storefront/latest/objects/metafield)

---

## Troubleshooting

### Common Issues

#### 1. "Access Denied" Error

**Symptoms:**
```json
{
  "errors": [{
    "message": "Access denied",
    "extensions": { "code": "ACCESS_DENIED" }
  }]
}
```

**Solutions:**
- Verify `SHOPIFY_STOREFRONT_TOKEN` is set in environment variables
- Check token is valid (not expired, not revoked)
- Verify token has Storefront API access enabled
- Check token is for the correct store

**Official Docs**: [Authentication](https://shopify.dev/docs/api/storefront/latest/authentication)

#### 2. "Throttled" Error

**Symptoms:**
```json
{
  "errors": [{
    "message": "Throttled",
    "extensions": { "code": "THROTTLED" }
  }]
}
```

**Solutions:**
- Implement request queuing
- Add exponential backoff retry logic
- Reduce request frequency
- Cache responses to reduce API calls

**Official Docs**: [Rate Limits](https://shopify.dev/docs/api/storefront/latest/rate-limits)

#### 3. "Collection Not Found"

**Symptoms:**
- Collection query returns `null`
- Products don't load on collection page

**Solutions:**
- Verify collection handle matches exactly (case-sensitive)
- Check collection exists in Shopify Admin
- Verify collection has products assigned
- For smart collections, check conditions match products

#### 4. "Metafield Not Found"

**Symptoms:**
- Metafield returns `null` in query
- Care instructions don't display

**Solutions:**
- Verify metafield namespace: `descriptors`
- Verify metafield key: `care_guide`
- Check metafield visibility is set to "Storefront API"
- Verify metafield is assigned to products

#### 5. Products Not Loading

**Symptoms:**
- Collection page shows no products
- Carousel is empty

**Solutions:**
- Check browser console for API errors
- Verify products are assigned to collection
- Check collection handle in URL matches Shopify
- Verify API endpoint is accessible
- Check network tab for failed requests

### Debugging Tools

**1. GraphiQL Explorer**
- Access via Shopify Admin → Apps → Your Storefront API app
- Test queries directly
- See query costs and complexity

**2. Browser DevTools**
- Network tab: Check API requests
- Console: Check for JavaScript errors
- Application tab: Check localStorage/cache

**3. Cloudflare Pages Logs**
- Check function logs for server-side errors
- Monitor API response times
- Check for rate limit issues

**Official Docs**: [Troubleshooting](https://shopify.dev/docs/api/storefront/latest)

---

## API Version Migration

### Current Version: 2024-01

### Recommended: 2025-10

**Migration Steps:**

1. **Update API Version in Code:**
   - `js/shopify.js`: Change `apiVersion` to `'2025-10'`
   - `functions/api/shopify.js`: Change default to `'2025-10'`
   - `functions/api/shopify-cart.js`: Change default to `'2025-10'`

2. **Test All Queries:**
   - Verify products query works
   - Verify collections query works
   - Verify cart operations work
   - Verify metafields query works

3. **Update Environment Variable:**
   - Set `SHOPIFY_API_VERSION=2025-10` in Cloudflare Pages

4. **Monitor for Breaking Changes:**
   - Check Shopify changelog for deprecations
   - Test on staging first
   - Monitor error logs after deployment

**Official Docs**: [API Versions](https://shopify.dev/docs/api/storefront/latest)

---

## Resources

### Official Documentation

- **Main Docs**: [https://shopify.dev/docs/api/storefront/latest](https://shopify.dev/docs/api/storefront/latest)
- **GraphQL Types**: [https://shopify.dev/docs/api/storefront/latest/objects](https://shopify.dev/docs/api/storefront/latest/objects)
- **Queries**: [https://shopify.dev/docs/api/storefront/latest/queries](https://shopify.dev/docs/api/storefront/latest/queries)
- **Mutations**: [https://shopify.dev/docs/api/storefront/latest/mutations](https://shopify.dev/docs/api/storefront/latest/mutations)
- **Changelog**: [https://shopify.dev/docs/api/storefront/latest/changelog](https://shopify.dev/docs/api/storefront/latest/changelog)

### Developer Tools

- **GraphiQL Explorer**: Test queries in Shopify Admin
- **Storefront Learning Kit**: Sample queries and examples
- **Hydrogen Framework**: React-based framework for headless commerce

### Support

- **Shopify Community**: [community.shopify.com](https://community.shopify.com)
- **Shopify Status**: [status.shopify.com](https://status.shopify.com)
- **API Support**: Check error messages for Request IDs

---

## Quick Reference

### API Endpoint
```
https://onlyatthekiosk.com/api/2025-10/graphql.json
```

### Authentication Header
```
X-Shopify-Storefront-Access-Token: {token}
```

### Current Implementation
- **Client**: `js/shopify.js`
- **Server Proxy**: `functions/api/shopify.js`
- **Cart Proxy**: `functions/api/shopify-cart.js`
- **Config**: `js/config.js`

### Environment Variables
- `SHOPIFY_STOREFRONT_TOKEN` - Required
- `SHOPIFY_STORE_DOMAIN` - Optional (defaults to `onlyatthekiosk.com`)
- `SHOPIFY_API_VERSION` - Optional (defaults to `2024-01`, should be `2025-10`)

---

**Last Updated**: Based on Storefront API 2025-10 documentation  
**Maintained By**: Development Team  
**Reference**: [Shopify Storefront API Docs](https://shopify.dev/docs/api/storefront/latest)

