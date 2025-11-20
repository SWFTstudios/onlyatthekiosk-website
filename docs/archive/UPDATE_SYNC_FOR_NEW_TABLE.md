# Updated Sync Configuration for New Products Table

## ✅ Products Table Found!

- **Table Name**: Products
- **Table ID**: `tbljwWvetx3bScjJ2`
- **URL**: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
- **Fields**: 48 (matching Shopify structure!)

## ✅ What's Been Updated

1. **Sync Function** (`supabase/functions/sync-airtable-products/index.ts`)
   - ✅ Updated table ID to `tbljwWvetx3bScjJ2`
   - ✅ Enhanced field mapping to handle all 48 fields
   - ✅ Added smart parsing for field type mismatches:
     - Handles dateTime fields that should be images
     - Parses singleSelect "Yes"/"No" to boolean
     - Handles Published field as singleSelect
     - Extracts image URLs from various formats

2. **Field Mapping Documentation** (`AIRTABLE_FIELD_MAPPING.md`)
   - ✅ Complete mapping of all 48 fields
   - ✅ Notes on field type issues
   - ✅ Recommendations for fixing field types

## ⚠️ Important: Field Type Fixes Needed

Your Airtable table has some fields with incorrect types that need to be fixed:

### Critical Fixes:

1. **Image Src** → Currently `dateTime`, should be `Attachment`
   - This breaks image syncing
   - Fix: In Airtable, change field type to "Attachment"

2. **Variant Image** → Currently `dateTime`, should be `Attachment`
   - This breaks secondary image syncing
   - Fix: In Airtable, change field type to "Attachment"

### Recommended Fixes:

3. **Published** → Currently `singleSelect`, could be `Checkbox`
   - Sync function handles both, but checkbox is cleaner

## ➕ Missing Fields to Add

Add these fields to your Airtable Products table for full functionality:

1. **Featured** (Checkbox)
   - Show products in featured section on store page

2. **Currency** (Single select: SEK, USD, EUR)
   - Default: SEK

3. **Category Display** (Single select: Chains & Bracelets, T-Shirts & Hoodies, Accessories)
   - For grouping products on store page

## 🚀 Next Steps

### Step 1: Fix Field Types in Airtable

1. Open your Products table: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
2. Fix **Image Src**:
   - Click field header → "Customize field type" → "Attachment"
3. Fix **Variant Image**:
   - Click field header → "Customize field type" → "Attachment"
4. Optional: Change **Published** to Checkbox

### Step 2: Add Missing Fields

Add the 3 fields listed above (Featured, Currency, Category Display)

### Step 3: Deploy Updated Sync Function

```bash
# Set the Airtable token (if not already set)
supabase secrets set AIRTABLE_PAT=YOUR_AIRTABLE_PAT_TOKEN

# Deploy the sync function
supabase functions deploy sync-airtable-products
```

### Step 4: Test Sync

1. Add a test product in Airtable with:
   - Handle: `test-product`
   - Title: `Test Product`
   - Variant Price: `1000`
   - Published: `Yes` (or checked if checkbox)
   - Status: `active` (or similar)
   - Image Src: Upload an image (after fixing field type)

2. Manually trigger sync:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/sync-airtable-products \
     -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
   ```

3. Verify in Supabase:
   ```sql
   SELECT * FROM public.products;
   SELECT * FROM public.store_products;
   ```

### Step 5: Set Up Automatic Sync

Follow `COMPLETE_SYNC_SETUP.md` to set up Airtable automation or scheduled sync.

## ✅ Current Status

- ✅ Supabase Products table created
- ✅ Sync function updated with correct table ID
- ✅ Field mapping configured for all 48 fields
- ⚠️ Need to fix Image Src and Variant Image field types
- ➕ Need to add Featured, Currency, Category Display fields
- ⏳ Deploy sync function
- ⏳ Test sync
- ⏳ Set up automatic sync

## 📝 Notes

The sync function is smart enough to work with your current field types, but fixing the image fields to Attachment type is **highly recommended** for proper image syncing. The function will attempt to extract image URLs from dateTime fields, but this may not work correctly.

