-- Create Products table in Supabase (matching Shopify structure)
-- This is a native Supabase table, not a foreign table

-- Drop existing table if you need to recreate (optional - comment out if you have data)
-- DROP TABLE IF EXISTS public.products CASCADE;

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
  shopify_product_id TEXT UNIQUE, -- To track which Shopify product this came from
  
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
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON public.products(shopify_product_id);

-- Unique indexes (allow NULL for products from single source)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_airtable_id_unique 
ON public.products(airtable_record_id) 
WHERE airtable_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shopify_id_unique 
ON public.products(shopify_product_id) 
WHERE shopify_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON public.products(shopify_product_id);

-- Enable Row Level Security (allow public read access)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view published products" ON public.products;

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing view if it exists (to avoid column rename errors)
DROP VIEW IF EXISTS public.store_products CASCADE;

-- Create a view for store products (easier to query)
CREATE VIEW public.store_products AS
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

