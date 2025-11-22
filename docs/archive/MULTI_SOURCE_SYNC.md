# Multi-Source Sync: Airtable + Shopify → Supabase

## Overview

You can sync products from both **Airtable** and **Shopify** into the same Supabase `products` table. This allows you to:

- Manage some products in Airtable (CMS)
- Sync products from Shopify store
- Combine data from both sources in Supabase
- Website queries Supabase (single source of truth)

## Architecture

```
┌─────────────┐         ┌──────────────┐
│   Airtable  │────────▶│              │
│    (CMS)    │  Sync   │   Supabase   │
└─────────────┘         │  Products    │
                        │    Table     │
┌─────────────┐         │              │
│   Shopify   │────────▶│              │
│   (Store)   │ Webhook │              │
└─────────────┘         └──────────────┘
                                │
                                │ Query
                                ▼
                        ┌─────────────┐
                        │   Website   │
                        │ (REST API)  │
                        └─────────────┘
```

## How It Works

### Product Tracking

Each product in Supabase can be tracked by source:

- **`airtable_record_id`**: Products synced from Airtable
- **`shopify_product_id`**: Products synced from Shopify
- **Both**: Product exists in both systems

### Sync Functions

1. **Airtable Sync** (`sync-airtable-products`)
   - Fetches all products from Airtable
   - Maps to Supabase schema
   - Sets `airtable_record_id`
   - Runs on schedule or via Airtable automation

2. **Shopify Sync** (`sync-shopify-product`)
   - Receives Shopify webhooks
   - Maps to Supabase schema
   - Sets `shopify_product_id`
   - Runs automatically when products change in Shopify

### Conflict Resolution

If the same product exists in both Airtable and Shopify:

- **Handle conflicts manually**: Update product in one source
- **Priority system**: Configure which source takes precedence
- **Separate products**: Keep them as separate products with different handles

## Setup

### Step 1: Update Products Table

Run this SQL to add Shopify product ID column:

```sql
-- Add shopify_product_id column
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS shopify_product_id TEXT;

-- Add unique index (allows NULL for products without Shopify ID)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shopify_id_unique 
ON public.products(shopify_product_id) 
WHERE shopify_product_id IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON public.products(shopify_product_id);
```

Or run the migration file:
```sql
-- See: supabase/migrations/20250102000000_add_shopify_product_id.sql
```

### Step 2: Set Up Airtable Sync (Already Done ✅)

- ✅ Function deployed: `sync-airtable-products` (slug: `super-processor`)
- ✅ Endpoint: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor`
- ✅ Sync tested and working

### Step 3: Set Up Shopify Sync

1. **Deploy Shopify sync function**:
   - Create function: `sync-shopify-product`
   - Copy code from `supabase/functions/sync-shopify-product/index.ts`
   - Set secret: `SHOPIFY_WEBHOOK_SECRET`

2. **Create Shopify webhook**:
   - Shopify Admin → Settings → Notifications → Webhooks
   - Event: `products/create`, `products/update`, `products/delete`
   - URL: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-shopify-product`

3. **Test sync**:
   - Create a product in Shopify
   - Check Supabase for synced product

## Querying Products by Source

### All Products (from both sources):
```sql
SELECT * FROM public.products;
```

### Airtable Products Only:
```sql
SELECT * FROM public.products 
WHERE airtable_record_id IS NOT NULL;
```

### Shopify Products Only:
```sql
SELECT * FROM public.products 
WHERE shopify_product_id IS NOT NULL;
```

### Products in Both Sources:
```sql
SELECT * FROM public.products 
WHERE airtable_record_id IS NOT NULL 
  AND shopify_product_id IS NOT NULL;
```

## Use Cases

### Use Case 1: Airtable as CMS, Shopify as Store
- Manage products in Airtable
- Sync to Supabase
- Optionally push to Shopify (future feature)
- Website reads from Supabase

### Use Case 2: Shopify as Store, Sync to Supabase
- Manage products in Shopify
- Sync to Supabase via webhooks
- Website reads from Supabase (faster than Shopify API)

### Use Case 3: Both Sources (Hybrid)
- Some products managed in Airtable
- Some products managed in Shopify
- Both sync to Supabase
- Website reads unified data from Supabase

## Benefits

✅ **Fast Queries**: Supabase REST API is faster than Shopify/Airtable APIs  
✅ **Unified Data**: All products in one place  
✅ **Real-time**: Both syncs are automatic  
✅ **Flexible**: Manage products in your preferred system  
✅ **Scalable**: Supabase handles high query loads  

## Next Steps

1. ✅ Airtable sync already working
2. ⏳ Add Shopify product ID column to products table
3. ⏳ Deploy Shopify sync function
4. ⏳ Create Shopify webhook
5. ⏳ Test both syncs together
6. ⏳ Update website to query Supabase

## Function Endpoints

**Airtable Sync:**
```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor
```

**Shopify Sync:**
```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-shopify-product
```

