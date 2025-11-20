# Complete Airtable → Supabase Sync Setup

## Overview

This guide sets up a complete sync system where:
- **Airtable** = CMS (you and client edit products here)
- **Supabase** = Database (fast queries for website)
- **Website** = Reads from Supabase REST API

## Architecture

```
Client edits in Airtable
    ↓
Airtable triggers webhook/automation
    ↓
Supabase Edge Function syncs data
    ↓
Supabase Products table updated
    ↓
Website queries Supabase REST API
    ↓
Products displayed on store page
```

## Step 1: Create Supabase Products Table

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- See: supabase/migrations/20250101000000_create_products_table.sql
```

Or copy the contents of that file and run it.

## Step 2: Set Up Airtable Table Structure

### Required Fields in Airtable:

Add these fields to your Products table (matching Shopify structure):

| Field Name | Field Type | Notes |
|------------|------------|-------|
| **Handle** | Single line text | Unique identifier (e.g., "play-two-jade-green") |
| **Title** | Single line text | Product name |
| **Body (HTML)** | Long text | Product description |
| **Vendor** | Single line text | "Only at The Kiosk" |
| **Product Category** | Single line text | Full category path |
| **Type** | Single select | Shirts, Pants, Accessories, etc. |
| **Tags** | Multiple select | Featured, Limited Stock, etc. |
| **Published** | Checkbox | Whether product is published |
| **Featured** | Checkbox | Show on featured section |
| **Status** | Single select | active, draft, archived |
| **Variant Price** | Number | Product price |
| **Currency** | Single select | SEK, USD, EUR |
| **Image Src** | Attachment | Primary product image |
| **Secondary Image** | Attachment | Hover/secondary image |
| **Category Display** | Single select | Chains & Bracelets, T-Shirts & Hoodies |

**Important**: Field names must match exactly (case-sensitive, spaces included).

## Step 3: Deploy Sync Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set environment variables
supabase secrets set AIRTABLE_PAT=YOUR_AIRTABLE_PAT_TOKEN

# Deploy the function
supabase functions deploy sync-airtable-products
```

### Option B: Manual Deployment

1. Go to Supabase Dashboard → Edge Functions
2. Create new function: `sync-airtable-products`
3. Copy code from `supabase/functions/sync-airtable-products/index.ts`
4. Set environment variables:
   - `AIRTABLE_PAT`: Your Airtable Personal Access Token
5. Deploy function

## Step 4: Set Up Automatic Sync

### Option A: Airtable Automation (Recommended - Real-time)

1. Go to your Airtable base → **Automations**
2. Create new automation:
   - **Trigger**: "When record matches conditions" OR "When record is created/updated"
   - **Condition**: Always (or filter by specific conditions)
   - **Action**: "Run script" or "Send web request"
   
3. **Webhook Action**:
   - URL: `https://your-project.supabase.co/functions/v1/sync-airtable-products`
   - Method: `POST`
   - Headers:
     - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type: application/json`
   - Body: `{}` (empty, function will fetch all records)

4. Save and enable automation

### Option B: Scheduled Sync (Supabase pg_cron)

Run this SQL in Supabase to sync every 5 minutes:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule sync function to run every 5 minutes
SELECT cron.schedule(
  'sync-airtable-products',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/sync-airtable-products',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Option C: Manual Trigger

You can manually trigger sync by:

1. **Via Supabase Dashboard**: Edge Functions → `sync-airtable-products` → Invoke
2. **Via API**: 
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/sync-airtable-products \
     -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
   ```

## Step 5: Test the Sync

### 1. Add a Product in Airtable

Add a test product with at least:
- Handle: `test-product`
- Title: `Test Product`
- Variant Price: `1000`
- Currency: `SEK`
- Published: ✓ (checked)
- Status: `active`
- Featured: ✓ (checked)

### 2. Trigger Sync

Run the sync function (manually or wait for automation).

### 3. Verify in Supabase

```sql
-- Check if product synced
SELECT * FROM public.products;
SELECT * FROM public.store_products;
```

## Step 6: Update Website to Query Supabase

Update `store.html` or create JavaScript to fetch products from Supabase REST API.

### Example Query:

```javascript
// Fetch products from Supabase
async function fetchProducts() {
  const { data, error } = await fetch(
    'https://your-project.supabase.co/rest/v1/store_products?featured=eq.true',
    {
      headers: {
        'apikey': 'YOUR_SUPABASE_ANON_KEY',
        'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
      }
    }
  ).then(res => res.json());
  
  return data;
}
```

## Environment Variables Needed

### In Supabase Dashboard → Settings → Edge Functions:

- `AIRTABLE_PAT`: Your Airtable Personal Access Token
- `SUPABASE_URL`: Automatically set
- `SUPABASE_SERVICE_ROLE_KEY`: Automatically set

## Troubleshooting

### Products Not Syncing:

1. Check Edge Function logs in Supabase Dashboard
2. Verify Airtable PAT token is valid
3. Check field names match exactly
4. Verify Supabase table exists

### Field Mismatch Errors:

- Field names must match exactly (case-sensitive)
- Fields with spaces must be quoted in SQL
- Check Airtable API documentation for exact field names

### Sync Not Triggering:

- Verify automation is enabled in Airtable
- Check webhook URL is correct
- Verify Supabase function is deployed
- Check function logs for errors

