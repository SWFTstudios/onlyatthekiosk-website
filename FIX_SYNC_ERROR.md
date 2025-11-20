# Fix Sync Function Error - Missing Required Fields

## ❌ Error Found

The sync function encountered an error when trying to create a product:

```
Error: null value in column "title" of relation "products" violates not-null constraint
```

**What happened:**
- Some products in Airtable don't have a `Title` field filled in
- The function tried to create products with null titles
- Supabase rejected them because `title` is a required field (NOT NULL)

## ✅ Fix Applied

I've updated the sync function to:

1. **Validate Required Fields**: Before processing each product, check that both `handle` and `title` are present
2. **Skip Invalid Records**: Products without required fields are skipped and logged
3. **Better Error Reporting**: Errors are now tracked and reported in the sync response

### Changes Made:

1. Added validation to skip products without `handle` or `title`
2. Added error tracking to operations object
3. Enhanced error messages in sync response

## 🚀 Redeploy the Function

You need to redeploy the updated function:

### Option A: Via Supabase Dashboard

1. Go to **Edge Functions** → `sync-airtable-products`
2. Copy the updated code from `supabase/functions/sync-airtable-products/index.ts`
3. Paste into the function editor
4. Click **"Deploy"**

### Option B: Via CLI (if you have it linked)

```bash
supabase functions deploy sync-airtable-products
```

## 🔍 Fix Airtable Products

After redeploying, check your Airtable Products table:

1. **Find products without Title**:
   - Filter by empty Title field
   - Add titles to all products that need them

2. **Find products without Handle**:
   - Filter by empty Handle field
   - Add handles to all products (required for URLs)

### Required Fields in Airtable:
- ✅ **Handle** (required) - Unique product identifier
- ✅ **Title** (required) - Product name
- ⚠️ Other fields are optional but recommended

## ✅ After Redeploy

1. Run the sync function again
2. Check the response - it should now show:
   - `skipped`: Number of products skipped due to missing fields
   - `errors`: Array of any errors (if any)
3. Products with required fields will sync successfully
4. Products without required fields will be skipped (not an error, just logged)

## 📊 Expected Response After Fix

```json
{
  "success": true,
  "message": "Sync completed",
  "operations": {
    "created": 10,
    "updated": 0,
    "deleted": 0,
    "skipped": 7,
    "errors": []
  },
  "total": 17,
  "summary": "10 created, 0 updated, 0 deleted, 7 skipped, 0 errors"
}
```

This means:
- ✅ 10 products synced successfully
- ⚠️ 7 products skipped (missing required fields)
- ✅ 0 errors

The skipped products just need to have their required fields filled in Airtable.

