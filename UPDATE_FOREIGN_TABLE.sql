-- ============================================
-- Update Foreign Table to Match Current Airtable Structure
-- ============================================
-- Your Products table currently has these fields:
-- 1. Name
-- 2. Notes
-- 3. Assignee
-- 4. Status
-- 5. Attachments
-- 6. Attachment Summary

-- Step 1: Drop the existing foreign table
DROP FOREIGN TABLE IF EXISTS airtable.products;

-- Step 2: Create foreign table matching CURRENT Airtable structure
CREATE FOREIGN TABLE airtable.products (
  "Name" text,
  "Notes" text,
  "Assignee" text,
  "Status" text,
  "Attachments" text,
  "Attachment Summary" text
)
SERVER airtable_server
OPTIONS (
  base_id 'appA3qQw0NAqz8ru3',
  table_id 'tblH1dZDvuUWfKuWb'
);

-- Step 3: Test the connection
SELECT * FROM airtable.products;

-- ============================================
-- NEXT: Add Shopify Product Fields to Airtable
-- ============================================
-- After you add the Shopify fields to your Airtable table,
-- we'll need to update this foreign table to include them.
-- 
-- Required fields to add in Airtable:
-- - Handle (Single line text)
-- - Title (Single line text) - or use "Name" if that's your title
-- - Body (HTML) (Long text) - or use "Notes" if that's your description
-- - Vendor (Single line text)
-- - Product Category (Single line text)
-- - Type (Single select)
-- - Tags (Multiple select)
-- - Published (Checkbox)
-- - Featured (Checkbox)
-- - Variant Price (Number)
-- - Currency (Single select)
-- - Image Src (Attachment)
-- - Secondary Image (Attachment)
-- - Category Display (Single select)
-- 
-- See AIRTABLE_PRODUCTS_TABLE_STRUCTURE.md for complete list

