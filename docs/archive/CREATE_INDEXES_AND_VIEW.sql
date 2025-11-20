-- ============================================
-- Step 2: Add Indexes, Policies, Triggers, and View
-- Run this AFTER the products table is created
-- ============================================

-- Step 1: Create indexes
CREATE INDEX IF NOT EXISTS idx_products_handle ON public.products(handle);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_display);
CREATE INDEX IF NOT EXISTS idx_products_airtable_id ON public.products(airtable_record_id);

-- Step 2: Enable Row Level Security (allow public read access)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view published products" ON public.products;

-- Step 4: Create policy: Anyone can read published products
CREATE POLICY "Anyone can view published products" ON public.products
  FOR SELECT
  USING (published = true AND status = 'active');

-- Step 5: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

-- Step 7: Create trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Drop existing view if it exists
DROP VIEW IF EXISTS public.store_products CASCADE;

-- Step 9: Create a view for store products (easier to query)
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

-- Step 10: Grant public access to view
GRANT SELECT ON public.store_products TO anon, authenticated;

-- Step 11: Verify everything is set up
SELECT 'Setup complete! Indexes, policies, triggers, and view created successfully.' as status;

-- Test: Verify the view works
SELECT COUNT(*) as products_in_view FROM public.store_products;

