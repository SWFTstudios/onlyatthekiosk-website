# Airtable → Supabase Sync Architecture

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Airtable  │   Sync  │   Supabase   │  Query  │   Website   │
│   (CMS)     │────────▶│  (Database)  │────────▶│  (Display)  │
│             │         │              │         │             │
│ Client edits│         │ Fast queries │         │  store.html │
│  products   │         │  REST API    │         │  index.html │
└─────────────┘         └──────────────┘         └─────────────┘
```

**Flow:**
1. Client/you edit products in Airtable (CMS editor)
2. Airtable automatically syncs to Supabase when records change
3. Website queries Supabase REST API for products
4. Website updates when Supabase data changes

## Step 1: Create Products Table in Supabase

First, we'll create a native Supabase table that matches Shopify structure.

### Run this SQL in Supabase:

```sql
-- Create Products table in Supabase (matching Shopify structure)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body_html TEXT,
  vendor TEXT DEFAULT 'Only at The Kiosk',
  product_category TEXT,
  type TEXT,
  tags TEXT[],
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft', -- active, draft, archived
  
  -- Variant fields (for single product variant)
  variant_sku TEXT,
  variant_price NUMERIC,
  variant_compare_at_price NUMERIC,
  currency TEXT DEFAULT 'SEK',
  variant_requires_shipping BOOLEAN DEFAULT true,
  variant_taxable BOOLEAN DEFAULT true,
  
  -- Images
  primary_image TEXT, -- URL to image
  secondary_image TEXT, -- URL to hover image
  image_alt_text TEXT,
  
  -- Display
  category_display TEXT, -- For store page grouping
  
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  airtable_record_id TEXT, -- To track which Airtable record this came from
  
  -- Indexes for performance
  CONSTRAINT products_status_check CHECK (status IN ('active', 'draft', 'archived'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_handle ON public.products(handle);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_display);
CREATE INDEX IF NOT EXISTS idx_products_airtable_id ON public.products(airtable_record_id);

-- Enable Row Level Security (allow public read access)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read published products
CREATE POLICY "Anyone can view published products" ON public.products
  FOR SELECT
  USING (published = true AND status = 'active');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for store products (easier to query)
CREATE OR REPLACE VIEW public.store_products AS
SELECT 
  id,
  handle,
  title,
  body_html as description,
  vendor,
  variant_price as price,
  currency,
  primary_image,
  secondary_image,
  image_alt_text,
  category_display as category,
  seo_title,
  seo_description,
  featured,
  created_at,
  updated_at
FROM public.products
WHERE published = true AND status = 'active';

-- Grant public access to view
GRANT SELECT ON public.store_products TO anon, authenticated;
```

## Step 2: Set Up Sync Mechanism

Since the Airtable wrapper is read-only, we'll use one of these sync methods:

### Option A: Airtable Automation → Supabase API (Recommended)

1. Create Airtable automation that triggers on record changes
2. Automation calls Supabase REST API to update/create/delete records
3. Fast, real-time sync

### Option B: Supabase Edge Function (Polling)

1. Create Edge Function that polls Airtable API
2. Compare with Supabase records
3. Update/create/delete as needed
4. Run on schedule (e.g., every 5 minutes)

### Option C: Webhook (If Airtable supports it)

1. Airtable sends webhook on record change
2. Supabase receives webhook
3. Edge Function processes and updates database

## Step 3: Create Sync Function

We'll create a Supabase Edge Function that syncs from Airtable.

