# Supabase to Airtable Connection Guide

## Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **Airtable Personal Access Token (PAT)**: Get from https://airtable.com/create/tokens
3. **Airtable Base ID**: Found in your Airtable base URL (e.g., `appA3qQw0NAqz8ru3`)
4. **Airtable Table ID**: Found in your table's API documentation

## Step 1: Get Your Airtable Credentials

### Get Personal Access Token (PAT):
1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Name it: "Supabase Integration"
4. Grant access to your base: "Only at The Kiosk" (or your base name)
5. Add scopes:
   - `data.records:read` (to read product data)
   - `schema.bases:read` (to read table structure)
6. Copy the token (starts with `pat...`)

### Get Base ID and Table ID:
1. Open your Airtable base
2. Go to Help → API documentation
3. Base ID is in the URL: `https://airtable.com/appXXXX/...`
4. Table ID is shown in the API docs for your "Products" table

## Step 2: Enable Airtable Wrapper in Supabase

### Connect to Your Supabase Database:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run these commands:

```sql
-- 1. Enable Wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- 2. Enable Airtable Wrapper
CREATE FOREIGN DATA WRAPPER airtable_wrapper
  HANDLER airtable_fdw_handler
  VALIDATOR airtable_fdw_validator;
```

## Step 3: Store Airtable Credentials Securely

### Using Supabase Vault (Recommended):

```sql
-- Store your Airtable Personal Access Token in Vault
SELECT vault.create_secret(
  'patYOUR_TOKEN_HERE',  -- Replace with your actual PAT
  'airtable_api_key',
  'Airtable API key for Products table'
);
```

**Note**: This will return a `key_id` - save this for the next step!

## Step 4: Create Foreign Server

```sql
-- Create the foreign server connection
CREATE SERVER airtable_server
  FOREIGN DATA WRAPPER airtable_wrapper
  OPTIONS (
    api_key_id '<key_ID>'  -- Replace with the key_id from Step 3
  );
```

## Step 5: Create Schema for Airtable Tables

```sql
-- Create a schema to hold foreign tables
CREATE SCHEMA IF NOT EXISTS airtable;
```

## Step 6: Create Foreign Table for Products

```sql
-- Create foreign table matching your Airtable Products table structure
CREATE FOREIGN TABLE airtable.products (
  handle text,
  title text,
  "Body (HTML)" text,
  vendor text,
  "Product Category" text,
  type text,
  tags text,
  published boolean,
  "Option1 Name" text,
  "Option1 Value" text,
  "Option2 Name" text,
  "Option2 Value" text,
  "Option3 Name" text,
  "Option3 Value" text,
  "Variant SKU" text,
  "Variant Grams" numeric,
  "Variant Inventory Tracker" text,
  "Variant Inventory Qty" integer,
  "Variant Inventory Policy" text,
  "Variant Fulfillment Service" text,
  "Variant Price" numeric,
  "Variant Compare At Price" numeric,
  "Variant Requires Shipping" boolean,
  "Variant Taxable" boolean,
  "Variant Barcode" text,
  "Image Src" text,
  "Image Position" integer,
  "Image Alt Text" text,
  "Gift Card" boolean,
  "SEO Title" text,
  "SEO Description" text,
  "Google Shopping / Google Product Category" integer,
  "Google Shopping / Gender" text,
  "Google Shopping / Age Group" text,
  "Google Shopping / MPN" text,
  "Google Shopping / Condition" text,
  "Google Shopping / Custom Product" boolean,
  "Variant Image" text,
  "Variant Weight Unit" text,
  "Variant Tax Code" text,
  "Cost per item" numeric,
  "Included / United States" boolean,
  "Price / United States" numeric,
  "Compare At Price / United States" numeric,
  "Included / International" boolean,
  "Price / International" numeric,
  "Compare At Price / International" numeric,
  status text,
  featured boolean,
  "Category Display" text,
  "Secondary Image" text,
  currency text
)
SERVER airtable_server
OPTIONS (
  base_id 'appA3qQw0NAqz8ru3',  -- Replace with your Airtable Base ID
  table_id 'tblXXXX'  -- Replace with your Products table ID
);
```

**Important Notes:**
- Field names with spaces must be quoted with double quotes
- Table names must be lowercase
- Replace `base_id` and `table_id` with your actual values

## Step 7: Query Your Airtable Data

```sql
-- Query all products
SELECT * FROM airtable.products;

-- Query only featured products
SELECT title, "Variant Price", currency, "Image Src"
FROM airtable.products
WHERE featured = true AND published = true;

-- Query products by category
SELECT title, "Variant Price", currency
FROM airtable.products
WHERE "Category Display" = 'Chains & Bracelets'
  AND published = true;
```

## Step 8: Create a View for Store Display

```sql
-- Create a view for easy querying of store products
CREATE VIEW store_products AS
SELECT 
  handle,
  title,
  "Variant Price" as price,
  currency,
  "Image Src" as primary_image,
  "Secondary Image" as secondary_image,
  "Image Alt Text" as alt_text,
  "Category Display" as category,
  "SEO Title" as seo_title,
  "SEO Description" as seo_description,
  status
FROM airtable.products
WHERE published = true
  AND status = 'active';
```

## Troubleshooting

### Common Issues:

1. **"Foreign table not found"**
   - Check that table name is lowercase
   - Verify base_id and table_id are correct

2. **"Authentication failed"**
   - Verify your PAT token is correct
   - Check token has proper scopes

3. **"Field not found"**
   - Field names must match exactly (case-sensitive)
   - Use double quotes for fields with spaces

### Testing Connection:

```sql
-- Test basic connection
SELECT COUNT(*) FROM airtable.products;

-- Test specific fields
SELECT title, "Variant Price" 
FROM airtable.products 
LIMIT 5;
```

## Next Steps

Once connected, you can:
1. Query products directly from Supabase
2. Create views for different product displays
3. Use Supabase Edge Functions to fetch and cache product data
4. Build API endpoints that serve product data to your store

