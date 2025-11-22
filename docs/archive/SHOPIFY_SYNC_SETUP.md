# Shopify → Supabase Sync Setup Guide

## Overview

Set up real-time sync from Shopify to Supabase. When products are created, updated, or deleted in Shopify, they automatically sync to Supabase.

## Architecture

```
Shopify Store → Webhook → Supabase Edge Function → Supabase Products Table → Website
```

**Flow:**
1. Product changes in Shopify (create/update/delete)
2. Shopify sends webhook to Supabase Edge Function
3. Function verifies webhook authenticity (HMAC)
4. Function syncs product to Supabase
5. Website queries Supabase REST API

## Prerequisites

1. ✅ Shopify store with Admin API access
2. ✅ Supabase project with Products table
3. ✅ Shopify webhook secret (for security)

## Step 1: Update Products Table (Add Shopify ID)

Run this SQL in Supabase Dashboard → SQL Editor to add Shopify product ID tracking:

```sql
-- Add shopify_product_id column if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS shopify_product_id TEXT UNIQUE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON public.products(shopify_product_id);
```

Or run the updated migration file which already includes this.

## Step 2: Create Shopify Webhook

1. Go to Shopify Admin → **Settings** → **Notifications** → **Webhooks**
2. Click **"Create webhook"**
3. Configure:
   - **Event**: Choose one or create multiple:
     - `products/create` - New products
     - `products/update` - Updated products  
     - `products/delete` - Deleted products
   - **Format**: JSON
   - **URL**: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-shopify-product`
   - **API version**: Latest (2024-01 or newer)

4. **Copy the webhook secret** - You'll need this for security

## Step 3: Deploy Supabase Edge Function

### Via Supabase Dashboard:

1. Go to **Edge Functions** → **Create a new function**
2. **Function name**: `sync-shopify-product`
3. **Copy code** from `supabase/functions/sync-shopify-product/index.ts`
4. **Set environment variables** (Secrets):
   - `SHOPIFY_WEBHOOK_SECRET`: Your Shopify webhook secret
   - `VERIFY_WEBHOOK`: `true` (default, set to `false` to disable verification during testing)

5. **Deploy** the function

### Via CLI:

```bash
# Set webhook secret
supabase secrets set SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Deploy function
supabase functions deploy sync-shopify-product
```

## Step 4: Test Webhook

### Test via Shopify:

1. In Shopify Admin, **create a test product**
2. Check Supabase **Edge Function logs** for the webhook
3. Verify product appears in Supabase:
   ```sql
   SELECT * FROM public.products 
   WHERE shopify_product_id IS NOT NULL 
   ORDER BY created_at DESC;
   ```

### Test via Manual Request:

```bash
# Test webhook manually (without HMAC for testing)
curl -X POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-shopify-product \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "x-shopify-topic: products/create" \
  -d '{"id":123,"title":"Test Product","handle":"test-product","status":"active"}'
```

## Step 5: Verify Sync

After creating/updating a product in Shopify:

1. **Check Edge Function logs** in Supabase Dashboard
2. **Verify product in Supabase**:
   ```sql
   -- Check synced products
   SELECT 
     shopify_product_id,
     handle,
     title,
     variant_price,
     published,
     status
   FROM public.products
   WHERE shopify_product_id IS NOT NULL;
   ```

## Field Mapping

### Shopify → Supabase Field Mapping:

| Shopify Field | Supabase Field | Notes |
|---------------|----------------|-------|
| `id` | `shopify_product_id` | Shopify product ID (stored as text) |
| `handle` | `handle` | Product handle/slug |
| `title` | `title` | Product title |
| `body_html` | `body_html` | Product description HTML |
| `vendor` | `vendor` | Vendor/brand name |
| `product_type` | `type` | Product type |
| `tags` | `tags` | Tags (comma-separated → array) |
| `status` | `published`, `status` | active → published=true, status='active' |
| `variants[0].price` | `variant_price` | First variant price |
| `variants[0].compare_at_price` | `variant_compare_at_price` | Compare price |
| `variants[0].sku` | `variant_sku` | SKU |
| `variants[0].requires_shipping` | `variant_requires_shipping` | Shipping flag |
| `variants[0].taxable` | `variant_taxable` | Tax flag |
| `images[0].src` | `primary_image` | First image URL |
| `images[1].src` | `secondary_image` | Second image URL |
| `images[0].alt` | `image_alt_text` | Image alt text |

## Webhook Events

The function handles these Shopify webhook events:

- **`products/create`**: Creates new product in Supabase
- **`products/update`**: Updates existing product in Supabase
- **`products/delete`**: Deletes product from Supabase

## Security

The function verifies webhook authenticity using HMAC signature:

1. Shopify signs webhooks with your webhook secret
2. Function verifies the signature matches
3. Only authentic webhooks are processed

### To disable verification (testing only):

Set environment variable:
```
VERIFY_WEBHOOK=false
```

⚠️ **Never disable verification in production!**

## Combining Airtable + Shopify Sync

If you sync from both Airtable and Shopify:

- Products can have both `airtable_record_id` AND `shopify_product_id`
- If product exists in Airtable, it keeps `airtable_record_id`
- If product comes from Shopify, it gets `shopify_product_id`
- You can query products by source:
  ```sql
  -- Airtable products
  SELECT * FROM products WHERE airtable_record_id IS NOT NULL;
  
  -- Shopify products
  SELECT * FROM products WHERE shopify_product_id IS NOT NULL;
  
  -- Both sources
  SELECT * FROM products;
  ```

## Troubleshooting

### Webhook Not Triggering:
1. Check webhook is enabled in Shopify
2. Verify webhook URL is correct
3. Check Edge Function logs for errors
4. Verify webhook secret is set correctly

### Webhook Verification Failing:
1. Verify `SHOPIFY_WEBHOOK_SECRET` is set correctly
2. Check HMAC header is being sent by Shopify
3. Temporarily disable verification for testing: `VERIFY_WEBHOOK=false`

### Products Not Syncing:
1. Check Edge Function logs
2. Verify Products table has `shopify_product_id` column
3. Check product has required fields (handle, title)
4. Verify function is deployed correctly

### Field Mapping Issues:
1. Check function logs for field mapping errors
2. Verify Shopify product structure matches expected format
3. Update field mapping in function if needed

## Next Steps

1. ✅ Deploy Shopify sync function
2. ✅ Create webhook in Shopify
3. ✅ Test with a product create/update
4. ✅ Verify products appear in Supabase
5. ✅ Set up both Airtable and Shopify sync (optional)

## Function Endpoint

**Shopify Sync Function:**
```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-shopify-product
```

Use this URL when creating webhooks in Shopify.

