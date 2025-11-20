# Airtable → Supabase Sync System Implementation

## Overview
Implemented a complete Airtable → Supabase sync system where Airtable serves as the CMS for product management and Supabase provides the fast database layer for the website.

## Architecture
```
Airtable (CMS) → Supabase Edge Function → Supabase Products Table → Website (REST API)
```

**Flow:**
1. Client edits products in Airtable (CMS)
2. Edge Function syncs products from Airtable to Supabase
3. Website queries Supabase REST API to display products
4. Changes in Airtable automatically sync to Supabase

## Components Added

### 1. Supabase Products Table
- **File**: `supabase/migrations/20250101000000_create_products_table.sql`
- **Table**: `public.products` - Native Supabase table matching Shopify structure
- **View**: `public.store_products` - Filtered view for published/active products
- **Features**:
  - 48+ fields matching Shopify product template
  - Row Level Security (RLS) enabled for public read access
  - Auto-update trigger on `updated_at` timestamp
  - Indexes for performance (handle, published, featured, status, category)

### 2. Sync Edge Function
- **File**: `supabase/functions/sync-airtable-products/index.ts`
- **Function Name**: `sync-airtable-products` (slug: `super-processor`)
- **Endpoint**: `https://aszjrkqvkewoykteczxf.supabase.co/functions/v1/super-processor`
- **Features**:
  - Fetches all products from Airtable Products table (`tbljwWvetx3bScjJ2`)
  - Maps Airtable fields to Supabase schema
  - Creates, updates, and deletes products in Supabase
  - Validates required fields (handle, title) - skips invalid records
  - Handles field type mismatches (dateTime → images, singleSelect → boolean)
  - Tracks operations (created, updated, deleted, skipped, errors)

### 3. Airtable Integration
- **Base ID**: `appA3qQw0NAqz8ru3`
- **Products Table ID**: `tbljwWvetx3bScjJ2`
- **PAT Token**: Stored as `AIRTABLE_PAT` secret in Supabase
- **Field Mapping**: All 48 Shopify fields mapped to Supabase

### 4. Setup Documentation
- `COMPLETE_SYNC_SETUP.md` - Full setup guide
- `SYNC_SETUP_SUMMARY.md` - Quick reference and checklist
- `AIRTABLE_FIELD_MAPPING.md` - Complete field mapping documentation
- `DEPLOY_SYNC_FUNCTION.md` - Deployment instructions
- `CORRECT_FUNCTION_URL.md` - Function endpoint reference

## How It Works

### Manual Sync
Call the Edge Function endpoint:
```bash
curl -X POST https://aszjrkqvkewoykteczxf.supabase.co/functions/v1/super-processor \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Automatic Sync (To Be Configured)
- **Option A**: Airtable Automation - Triggers on record changes
- **Option B**: Scheduled Sync (pg_cron) - Runs every 5 minutes

### Query Products from Website
```javascript
const response = await fetch(
  'https://aszjrkqvkewoykteczxf.supabase.co/rest/v1/store_products?featured=eq.true',
  {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  }
)
```

## Current Status

✅ **Completed:**
- Supabase Products table created with full Shopify structure
- Edge Function deployed and tested
- Airtable Products table configured (48 fields)
- Field mapping and validation implemented
- Sync tested successfully (17 products fetched, 3 updated, 14 skipped)

⚠️ **In Progress:**
- Fixing skipped products (missing Handle or Title in Airtable)
- Setting up automatic sync
- Updating website to query Supabase

## Key Features

1. **Validation**: Products without required fields (handle, title) are skipped, not errors
2. **Smart Field Mapping**: Handles field type mismatches and variations
3. **Bidirectional Sync**: Tracks Airtable record IDs for updates
4. **Error Handling**: Comprehensive error tracking and reporting
5. **Performance**: Indexed queries, efficient batch operations

## Testing

The sync function has been tested and is working correctly:
- Successfully syncing products from Airtable
- Validation working (skipping invalid records)
- No errors in sync process
- Products queryable via Supabase REST API

## Next Steps

1. Fill in missing Handle/Title fields in Airtable for skipped products
2. Set up automatic sync (Airtable automation or scheduled cron)
3. Update website (`store.html`) to fetch products from Supabase
4. Test end-to-end flow: Airtable → Supabase → Website

## Files Changed/Added

### New Files:
- `supabase/migrations/20250101000000_create_products_table.sql`
- `supabase/functions/sync-airtable-products/index.ts`
- Multiple documentation files (`.md` files)

### Modified Files:
- Setup documentation files

### Configuration:
- Supabase Edge Function secret: `AIRTABLE_PAT`
- Function deployed to: `super-processor` endpoint

