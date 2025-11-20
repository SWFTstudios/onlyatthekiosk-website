# Airtable ↔ Supabase Sync Setup Summary

## ✅ Completed Steps

### 1. Supabase Database Setup
- ✅ Products table created (`public.products`)
- ✅ Indexes created for performance
- ✅ Row Level Security enabled
- ✅ Public read policy configured
- ✅ Auto-update trigger on `updated_at`
- ✅ `store_products` view created

### 2. Airtable Products Table
- ✅ Table ID: `tbljwWvetx3bScjJ2`
- ✅ URL: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
- ✅ 48 fields matching Shopify structure

### 3. Sync Function
- ✅ Updated with correct table ID: `tbljwWvetx3bScjJ2`
- ✅ Field mapping configured for all 48 Airtable fields
- ✅ Smart parsing for field type mismatches
- ✅ Image URL extraction logic
- ✅ Boolean parsing for Published/Featured fields

## ⚠️ Issues to Fix in Airtable

### Critical Field Type Fixes:

1. **Image Src** (Field #26)
   - Current Type: `dateTime` ❌
   - Should Be: `Attachment` ✅
   - Impact: Images won't sync correctly
   - Fix: In Airtable, click field header → "Customize field type" → "Attachment"

2. **Variant Image** (Field #38)
   - Current Type: `dateTime` ❌
   - Should Be: `Attachment` ✅
   - Impact: Secondary/hover images won't sync
   - Fix: In Airtable, click field header → "Customize field type" → "Attachment"

### Recommended Field Type Changes:

3. **Published** (Field #8)
   - Current Type: `singleSelect` (Yes/No)
   - Could Be: `Checkbox` (simpler)
   - Impact: Sync works with both, but checkbox is cleaner
   - Fix: Optional - sync function handles both

4. **Variant Requires Shipping** (Field #23)
   - Current Type: `singleSelect`
   - Could Be: `Checkbox`
   - Fix: Optional

5. **Variant Taxable** (Field #24)
   - Current Type: `singleSelect`
   - Could Be: `Checkbox`
   - Fix: Optional

## ➕ Missing Fields to Add

Add these fields to your Airtable Products table for full functionality:

| Field Name | Field Type | Options | Default | Purpose |
|------------|------------|---------|---------|---------|
| **Featured** | Checkbox | - | Unchecked | Show in featured section on store page |
| **Currency** | Single select | SEK, USD, EUR | SEK | Product currency |
| **Category Display** | Single select | Chains & Bracelets<br>T-Shirts & Hoodies<br>Accessories | - | For grouping products on store page |

### How to Add:

1. Open your Products table: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
2. Click the **"+"** button to add a new field
3. Add each field according to the table above

## 🚀 Next Steps

### Step 1: Fix Field Types in Airtable

1. **Fix Image Src**:
   - Click on "Image Src" column header
   - Select "Customize field type"
   - Choose "Attachment"
   - Click "Save"

2. **Fix Variant Image**:
   - Click on "Variant Image" column header
   - Select "Customize field type"
   - Choose "Attachment"
   - Click "Save"

### Step 2: Add Missing Fields

Add the 3 fields listed above (Featured, Currency, Category Display)

### Step 3: Deploy Sync Function

```bash
# Make sure you're in the project directory
cd "/Users/elombe.kisala/Library/Mobile Documents/com~apple~CloudDocs/Work - SWFT Studios/Personal Projects/onlyatthekiosk/onlyatthekiosk-website"

# Set the Airtable token (if not already set)
supabase secrets set AIRTABLE_PAT=YOUR_AIRTABLE_PAT_TOKEN

# Deploy the sync function
supabase functions deploy sync-airtable-products
```

**Note**: If you haven't linked your Supabase project yet:
```bash
# Login to Supabase
supabase login

# Link your project (get project ref from Supabase Dashboard → Settings → General)
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Test Manual Sync

1. **Add a test product in Airtable**:
   - Handle: `test-product`
   - Title: `Test Product`
   - Variant Price: `1000`
   - Published: `Yes` (or checked if checkbox)
   - Status: `active`
   - Image Src: Upload an image (after fixing field type)
   - Featured: Checked (after adding field)

2. **Trigger sync manually**:
   - Go to Supabase Dashboard → Edge Functions → `sync-airtable-products` → Invoke
   - OR use curl:
     ```bash
     curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-airtable-products \
       -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
     ```

3. **Verify in Supabase**:
   ```sql
   -- Check all products
   SELECT * FROM public.products;
   
   -- Check store products view
   SELECT * FROM public.store_products;
   
   -- Check featured products
   SELECT * FROM public.store_products WHERE featured = true;
   ```

### Step 5: Set Up Automatic Sync

Choose one of these methods:

#### Option A: Airtable Automation (Recommended - Real-time)

1. Go to Airtable → **Automations**
2. Create new automation:
   - **Trigger**: "When record matches conditions" or "When record is created/updated"
   - **Condition**: Always (or specific conditions)
   - **Action**: "Run script" or "Send web request"
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/sync-airtable-products`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type: application/json`
   - **Body**: `{}`
3. Save and enable automation

#### Option B: Scheduled Sync (Every 5 minutes)

Run this SQL in Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'sync-airtable-products',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/sync-airtable-products',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Step 6: Update Website to Query Supabase

Update `store.html` or create JavaScript to fetch products from Supabase REST API:

```javascript
// Example: Fetch featured products from Supabase
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

async function fetchProducts() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/store_products?featured=eq.true&order=created_at.desc`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  )
  return await response.json()
}
```

## 📋 Quick Reference

- **Airtable Products Table**: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
- **Table ID**: `tbljwWvetx3bScjJ2`
- **Base ID**: `appA3qQw0NAqz8ru3`
- **Sync Function**: `supabase/functions/sync-airtable-products/index.ts`

## ✅ Status Checklist

- [x] Supabase Products table created
- [x] Sync function updated with correct table ID
- [x] Field mapping configured
- [ ] Fix Image Src field type to Attachment
- [ ] Fix Variant Image field type to Attachment
- [ ] Add Featured field (Checkbox)
- [ ] Add Currency field (Single select)
- [ ] Add Category Display field (Single select)
- [ ] Deploy sync function
- [ ] Test manual sync
- [ ] Set up automatic sync
- [ ] Update website to query Supabase

## 📚 Documentation Files

- `AIRTABLE_FIELD_MAPPING.md` - Complete field mapping details
- `UPDATE_SYNC_FOR_NEW_TABLE.md` - Detailed update instructions
- `COMPLETE_SYNC_SETUP.md` - Full setup guide
- `SETUP_CHECKLIST.md` - Step-by-step checklist

