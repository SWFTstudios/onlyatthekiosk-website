# Shopify → Supabase Sync Integration

## Overview

Yes! You can sync your Shopify store with Supabase. This allows you to:
- Keep product data in sync between Shopify and Supabase
- Use Supabase as a fast database layer for your website
- Combine data from Shopify + Airtable (if needed)

## Architecture Options

### Option A: Shopify → Supabase (Direct)
```
Shopify Store → Supabase Edge Function → Supabase Products Table → Website
```
**Use Case**: Sync products FROM Shopify TO Supabase for fast queries

### Option B: Airtable ↔ Shopify ↔ Supabase (Multi-Source)
```
Airtable (CMS) → Supabase → Website
Shopify (Store) → Supabase → Website
```
**Use Case**: Manage products in Airtable AND sync from Shopify

### Option C: Airtable → Supabase → Shopify (Airtable as Source)
```
Airtable (CMS) → Supabase → Shopify Store → Website
```
**Use Case**: Use Airtable as single source of truth, push to both Supabase and Shopify

## Option 1: Shopify → Supabase Sync (Recommended)

Sync products FROM Shopify TO Supabase when products change in Shopify.

### How It Works

1. **Shopify Webhook** triggers when product is created/updated/deleted
2. **Supabase Edge Function** receives webhook
3. **Function syncs** product data to Supabase `products` table
4. **Website queries** Supabase for fast product display

### Setup Steps

#### Step 1: Create Shopify Webhook

1. Go to Shopify Admin → **Settings** → **Notifications** → **Webhooks**
2. Click **"Create webhook"**
3. Configure:
   - **Event**: Choose one:
     - `products/create` - New products
     - `products/update` - Updated products
     - `products/delete` - Deleted products
     - OR use all three
   - **Format**: JSON
   - **URL**: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-shopify-product`
   - **API version**: Latest

#### Step 2: Create Supabase Edge Function

Create a new Edge Function: `sync-shopify-product`

This function will:
- Receive Shopify webhook payload
- Extract product data
- Map Shopify fields to Supabase schema
- Insert/update product in Supabase

#### Step 3: Verify Webhook Secret

Shopify webhooks include an HMAC signature for security. The function should verify this.

## Option 2: Sync FROM Supabase TO Shopify

If you want to push products FROM Supabase/Airtable TO Shopify:

### How It Works

1. Product changes in Airtable
2. Syncs to Supabase
3. Supabase function pushes to Shopify via Shopify Admin API
4. Product appears in Shopify store

### Requirements

- Shopify Admin API access token
- Shopify store domain
- Edge Function to call Shopify Admin API

## Option 3: Scheduled Sync (Shopify → Supabase)

Sync all products from Shopify on a schedule (e.g., every hour):

### How It Works

1. **Scheduled Edge Function** runs every X minutes
2. **Queries Shopify Admin API** for all products
3. **Syncs to Supabase** (creates/updates/deletes)
4. Similar to your Airtable sync

## Implementation Guide

I can create a Shopify sync Edge Function that:
1. Receives Shopify webhooks (product create/update/delete)
2. Verifies webhook authenticity (HMAC)
3. Maps Shopify product fields to Supabase schema
4. Syncs to Supabase `products` table

### Shopify Product Fields Mapping

| Shopify Field | Supabase Field | Notes |
|---------------|----------------|-------|
| `id` | `shopify_product_id` | Shopify product ID |
| `handle` | `handle` | Product handle/slug |
| `title` | `title` | Product title |
| `body_html` | `body_html` | Product description |
| `vendor` | `vendor` | Vendor/brand name |
| `product_type` | `type` | Product type |
| `tags` | `tags` | Product tags (array) |
| `status` | `published` | active/draft |
| `variants[0].price` | `variant_price` | First variant price |
| `variants[0].compare_at_price` | `variant_compare_at_price` | Compare price |
| `images[0].src` | `primary_image` | First product image |
| `images[1].src` | `secondary_image` | Second product image |

## Which Option Should You Use?

### Use Shopify → Supabase if:
- ✅ You manage products in Shopify
- ✅ You want Shopify to be the source of truth
- ✅ You want automatic sync when products change in Shopify

### Use Airtable → Supabase if:
- ✅ You manage products in Airtable (current setup)
- ✅ You want more control over product data structure
- ✅ You're not actively using Shopify Admin

### Use Both if:
- ✅ You want to sync from multiple sources
- ✅ You manage some products in Airtable, some in Shopify
- ✅ You want to merge data from both sources

## Recommendation

Since you already have **Airtable → Supabase** working:

1. **Keep Airtable as your CMS** for product management
2. **Optionally add Shopify sync** if you also sell on Shopify
3. **Website queries Supabase** (which has data from both sources if needed)

Or, if you want to **switch to Shopify as source**:
1. Set up **Shopify → Supabase** sync
2. Keep Airtable sync as backup/secondary source
3. Website queries Supabase

## Next Steps

Tell me which option you prefer, and I'll create:
1. ✅ Shopify webhook Edge Function
2. ✅ Field mapping for Shopify → Supabase
3. ✅ Webhook verification (security)
4. ✅ Setup instructions

Would you like me to create a Shopify sync function that works alongside your Airtable sync?

