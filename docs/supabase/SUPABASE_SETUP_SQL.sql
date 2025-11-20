-- ============================================
-- Supabase to Airtable Connection Setup
-- ============================================
-- Run these commands in Supabase Dashboard → SQL Editor
-- Replace YOUR_TABLE_ID with your actual Products table ID

-- Step 1: Enable Wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Step 2: Enable Airtable Wrapper
CREATE FOREIGN DATA WRAPPER airtable_wrapper
  HANDLER airtable_fdw_handler
  VALIDATOR airtable_fdw_validator;

-- Step 3: Store Airtable Personal Access Token in Vault
-- This will return a key_id - SAVE IT for the next step!
SELECT vault.create_secret(
  'YOUR_AIRTABLE_PAT_TOKEN',
  'airtable_api_key',
  'Airtable API key for Products table'
);

-- ⚠️ IMPORTANT: Copy the key_id returned above and use it in the next command
-- It will look something like: 00000000-0000-0000-0000-000000000000

-- Step 4: Create Foreign Server
-- Key ID from Step 3: 0be13a9f-4e3e-4cc4-a2cb-d25910d81c38
CREATE SERVER airtable_server
  FOREIGN DATA WRAPPER airtable_wrapper
  OPTIONS (
    api_key_id '0be13a9f-4e3e-4cc4-a2cb-d25910d81c38'
  );

-- Step 5: Create Schema for Airtable Tables
CREATE SCHEMA IF NOT EXISTS airtable;

-- Step 6: Create Foreign Table for Products
-- Table ID: tblH1dZDvuUWfKuWb (from Airtable URL)
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
  base_id 'appA3qQw0NAqz8ru3',
  table_id 'tblH1dZDvuUWfKuWb'  -- Products table ID
);

-- Step 7: Test the Connection
-- Run this after completing all steps above
SELECT COUNT(*) as total_products FROM airtable.products;

-- Step 8: Create a View for Easy Querying
CREATE OR REPLACE VIEW public.store_products AS
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
  status,
  featured,
  published
FROM airtable.products
WHERE published = true AND status = 'active';

-- Step 9: Test the View
SELECT * FROM public.store_products WHERE featured = true LIMIT 5;

