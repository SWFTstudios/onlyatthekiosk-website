-- ============================================
-- Create Products Table - Run this FIRST
-- ============================================
-- Step 1: Create the products table

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
  airtable_record_id TEXT UNIQUE, -- To track which Airtable record this came from
  
  -- Constraint
  CONSTRAINT products_status_check CHECK (status IN ('active', 'draft', 'archived'))
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_products_handle ON public.products(handle);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_display);
CREATE INDEX IF NOT EXISTS idx_products_airtable_id ON public.products(airtable_record_id);

-- Step 3: Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view published products" ON public.products;

-- Step 5: Create policy: Anyone can read published products
CREATE POLICY "Anyone can view published products" ON public.products
  FOR SELECT
  USING (published = true AND status = 'active');

-- Step 6: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

-- Step 8: Create trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Drop existing view if it exists
DROP VIEW IF EXISTS public.store_products CASCADE;

-- Step 10: Create a view for store products (easier to query)
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

-- Step 11: Grant public access to view
GRANT SELECT ON public.store_products TO anon, authenticated;

-- Verify the table was created
SELECT 'Products table created successfully!' as status;
SELECT COUNT(*) as product_count FROM public.products;

