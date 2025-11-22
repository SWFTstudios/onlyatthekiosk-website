# Shopify Storefront API Setup Guide

**📚 For comprehensive API reference, queries, best practices, and troubleshooting, see**: [`SHOPIFY_STOREFRONT_API_REFERENCE.md`](SHOPIFY_STOREFRONT_API_REFERENCE.md)

**Official Documentation**: [https://shopify.dev/docs/api/storefront/latest](https://shopify.dev/docs/api/storefront/latest)

## Overview

This guide walks you through setting up and verifying access to the Shopify Storefront API for the Only at The Kiosk website. The Storefront API allows your custom frontend to fetch products, collections, and manage cart operations.

## Prerequisites

- Shopify Admin access to `onlyatthekiosk.com`
- Understanding of API authentication
- Access to Cloudflare Pages dashboard (for environment variables)

---

## Step 1: Create or Verify Storefront API App

### Option A: Create New Storefront API App

1. Go to **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click **"Develop apps"** (or **"Develop apps for your store"**)
3. Click **"Create an app"**
4. Enter app name: `Only at The Kiosk Storefront API`
5. Click **"Create app"**
6. Click **"Configure Admin API scopes"** (we'll configure Storefront API next)

### Option B: Use Existing App

1. Go to **Shopify Admin** → **Settings** → **Apps and sales channels** → **Develop apps**
2. Find your existing Storefront API app
3. Click on it to open configuration

---

## Step 2: Configure Storefront API Scopes

1. In your app settings, click **"Configure Storefront API scopes"**
2. Select the following scopes:
   - ✅ **unauthenticated_read_product_listings** - Read products and collections
   - ✅ **unauthenticated_read_product_inventory** - Read inventory levels
   - ✅ **unauthenticated_read_checkouts** - Read checkout data
   - ✅ **unauthenticated_write_checkouts** - Create and update checkouts
   - ✅ **unauthenticated_write_customers** - Create customer accounts (optional)
   - ✅ **unauthenticated_read_customers** - Read customer data (optional)
3. Click **"Save"**

---

## Step 3: Install App and Get Access Token

1. After configuring scopes, click **"Install app"** (or **"Reinstall app"** if updating)
2. Review the permissions and click **"Install"** to confirm
3. After installation, you'll see the **"API credentials"** section
4. Click **"Reveal token once"** under **"Storefront API access token"**
5. **Copy the token immediately** - you won't be able to see it again!
6. Store this token securely (you'll add it to Cloudflare Pages environment variables)

**Important**: 
- The Storefront API access token is different from the Admin API access token
- Storefront API tokens start with `shpat_` or `shpca_`
- Never commit this token to version control

---

## Step 4: Verify API Endpoint

The Storefront API endpoint for your store follows this format:

```
https://{store-domain}/api/{api-version}/graphql.json
```

For `onlyatthekiosk.com`:

```
https://onlyatthekiosk.com/api/2024-01/graphql.json
```

**API Version**: The API version (e.g., `2024-01`) should match the version your app is using. Check your app settings to confirm the API version.

---

## Step 5: Test API Access with GraphiQL Explorer

Shopify provides a GraphiQL explorer to test your API queries:

1. In your app settings, click **"Open GraphiQL explorer"**
2. The explorer will open with your Storefront API access token pre-configured
3. Test a simple query:

```graphql
query {
  shop {
    name
    description
  }
}
```

4. Click the play button to execute
5. Verify you get a response with your shop name

### Test Product Query

Try fetching products:

```graphql
query {
  products(first: 5) {
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
        images(first: 3) {
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
```

---

## Step 6: Set Up Environment Variables

### Cloudflare Pages Environment Variables

1. Go to **Cloudflare Dashboard** → **Pages** → Select your project
2. Go to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Variable name**: `SHOPIFY_STOREFRONT_TOKEN`
   - **Value**: Your Storefront API access token (from Step 3)
   - **Environment**: Select **Production**, **Preview**, and **Development** as needed
4. Click **"Save"**

### Local Development (.dev.vars)

For local development with `wrangler pages dev`, create a `.dev.vars` file in your project root:

```bash
# .dev.vars (DO NOT COMMIT THIS FILE - add to .gitignore)
SHOPIFY_STOREFRONT_TOKEN=your_storefront_api_token_here
```

**Important**: 
- Add `.dev.vars` to `.gitignore` to prevent committing secrets
- Never commit API tokens to version control

---

## Step 7: Verify API Access from Cloudflare Function

After setting up environment variables, test that your Cloudflare Pages Function can access the API:

### Test Endpoint

Once you've created `functions/api/shopify.js` (see Phase 1.1), you can test it:

```bash
# Using curl (replace with your Cloudflare Pages URL)
curl -X POST https://your-site.pages.dev/api/shopify \
  -H "Content-Type: application/json" \
  -d '{"query": "{ shop { name } }"}'
```

### Expected Response

```json
{
  "data": {
    "shop": {
      "name": "Only at The Kiosk"
    }
  }
}
```

---

## Step 8: Security Best Practices

### Token Security

1. **Never expose tokens in client-side code**
   - All API calls should go through Cloudflare Pages Functions
   - Functions act as a proxy, keeping tokens server-side

2. **Use environment variables**
   - Store tokens in Cloudflare Pages environment variables
   - Use `.dev.vars` for local development (gitignored)

3. **Rotate tokens regularly**
   - If a token is compromised, regenerate it in Shopify Admin
   - Update the token in Cloudflare Pages environment variables

### API Rate Limits

Shopify Storefront API has rate limits:
- **Default**: 2,000 points per second
- **Burst**: Up to 4,000 points
- **Cost per query**: Varies by query complexity

Monitor your API usage in the Shopify Admin app settings.

---

## Troubleshooting

### "Invalid API key" Error

**Problem**: API calls return authentication errors  
**Solution**:
- Verify the token is correct (no extra spaces or characters)
- Check the token is the Storefront API token, not Admin API token
- Ensure the app is installed and has correct scopes
- Verify environment variable is set correctly in Cloudflare Pages

### "Access denied" Error

**Problem**: API calls return permission errors  
**Solution**:
- Verify Storefront API scopes are configured correctly
- Check that the app is installed (not just created)
- Ensure products/collections are published and visible

### "API version not found" Error

**Problem**: API endpoint returns version errors  
**Solution**:
- Verify the API version in the endpoint URL matches your app's API version
- Check Shopify Admin → Settings → Apps → Your app → API version
- Update the endpoint URL if needed (e.g., `2024-01` → `2024-04`)

### CORS Errors

**Problem**: Browser shows CORS errors when calling API  
**Solution**:
- This is expected - the Storefront API should not be called directly from the browser
- All API calls should go through Cloudflare Pages Functions
- Functions handle CORS headers properly

---

## API Version Management

### Current API Version

The project uses API version `2024-01` by default. To update:

1. Check Shopify's latest API version: [Shopify API Versions](https://shopify.dev/api/admin-graphql#api-versions)
2. Update the API endpoint URL in:
   - `functions/api/shopify.js`
   - `js/shopify.js` (if API URL is referenced)
   - `js/config.js` (if using a config file)

### API Version Format

Shopify API versions follow the format: `YYYY-MM` (e.g., `2024-01`, `2024-04`)

---

## Next Steps

After setting up the Storefront API:

1. ✅ Create test products in Shopify (see `docs/SHOPIFY_PRODUCT_SETUP.md`)
2. ✅ Create Shopify API proxy function (Phase 1.1)
3. ✅ Create client-side Shopify utility (Phase 1.2)
4. ✅ Test product queries from frontend
5. ✅ Implement cart functionality (Phase 2)

---

## Additional Resources

- [Shopify Storefront API Documentation](https://shopify.dev/api/storefront)
- [GraphQL Query Examples](https://shopify.dev/api/storefront/reference)
- [API Rate Limits](https://shopify.dev/api/usage/rate-limits)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)

---

**Last Updated**: January 2025  
**Related Documentation**: 
- `docs/SHOPIFY_PRODUCT_SETUP.md` - Product setup guide
- `INSTRUCTIONS.md` - General project instructions

