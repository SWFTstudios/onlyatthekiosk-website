-- ============================================
-- Verify Airtable Table Structure
-- ============================================
-- Run this to check what fields actually exist in your Airtable table
-- This will help us match the foreign table field names

-- First, let's try to query with minimal fields to see what works
-- If this works, we know the connection is good and we just need to match field names

-- Test 1: Try to get any data (this will show us what fields exist)
-- Note: This might fail if field names don't match, but that's okay - it tells us what's wrong
SELECT * FROM airtable.products LIMIT 1;

-- If the above fails, try this simpler approach:
-- Query just the record ID (this should always work)
-- Note: Airtable always has an internal record ID, but we can't query it directly
-- We need to match field names exactly

-- Alternative: Check if specific common fields exist
-- Try these one at a time to see which ones work:

-- Test 2: Try common field names
SELECT 
  title,
  handle
FROM airtable.products 
LIMIT 1;

-- If that works, try more fields:
-- Test 3: Try with price field
SELECT 
  title,
  "Variant Price",
  currency
FROM airtable.products 
LIMIT 1;

-- If you get errors about missing fields, note which field names failed
-- Then we can adjust the CREATE FOREIGN TABLE statement to match your actual Airtable field names

