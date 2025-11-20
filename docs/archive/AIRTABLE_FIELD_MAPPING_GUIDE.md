# Airtable Field Name Mapping Guide

## Issue: Getting 0 results from Airtable query

If `SELECT COUNT(*) FROM airtable.products` returns 0, it could mean:
1. ✅ Connection is working (no errors)
2. ❓ Table is empty, OR
3. ❓ Field names don't match

## How to Find Your Actual Airtable Field Names

### Method 1: Check Airtable API Documentation

1. Go to your Airtable base: https://airtable.com/appA3qQw0NAqz8ru3
2. Click **Help** → **API documentation**
3. Find your **Products** table
4. Look at the field names listed (they're case-sensitive!)

### Method 2: Test Field Names in Supabase

Run these queries one at a time to see which fields work:

```sql
-- Test 1: Try basic fields
SELECT title FROM airtable.products LIMIT 1;

-- Test 2: Try with quotes (for fields with spaces)
SELECT "Variant Price" FROM airtable.products LIMIT 1;

-- Test 3: Try common variations
SELECT 
  "Title",
  "Handle",
  "Price",
  "Currency"
FROM airtable.products LIMIT 1;
```

### Method 3: Check Airtable Table Directly

1. Open your Products table in Airtable
2. Look at the column headers
3. Note the exact spelling and capitalization
4. Fields with spaces need to be quoted in SQL: `"Field Name"`

## Common Field Name Issues

| What You Might Have | What Airtable Might Use |
|---------------------|------------------------|
| `handle` | `Handle` or `Product Handle` |
| `title` | `Title` or `Product Title` |
| `Variant Price` | `Price` or `Product Price` |
| `currency` | `Currency` or `Price Currency` |
| `Image Src` | `Image` or `Product Image` |
| `featured` | `Featured` or `Is Featured` |
| `published` | `Published` or `Is Published` |
| `status` | `Status` or `Product Status` |

## Fixing the Foreign Table

Once you know the correct field names, update the CREATE FOREIGN TABLE statement:

```sql
-- Drop the existing foreign table
DROP FOREIGN TABLE IF EXISTS airtable.products;

-- Recreate with correct field names
CREATE FOREIGN TABLE airtable.products (
  -- Use your actual Airtable field names here
  "Handle" text,  -- Note: Capital H if that's what Airtable uses
  "Title" text,
  "Price" numeric,  -- Might be "Price" not "Variant Price"
  "Currency" text,
  "Image" text,  -- Might be "Image" not "Image Src"
  "Featured" boolean,
  "Published" boolean,
  "Status" text
  -- Add all your actual field names
)
SERVER airtable_server
OPTIONS (
  base_id 'appA3qQw0NAqz8ru3',
  table_id 'tblH1dZDvuUWfKuWb'
);
```

## Quick Test Query

After fixing field names, test with:

```sql
SELECT * FROM airtable.products LIMIT 1;
```

This will show you all available fields and their values.

