-- Fix for view column rename error
-- If you get the error about changing view column names, run this first

-- Drop the existing view
DROP VIEW IF EXISTS public.store_products CASCADE;

-- Now run the full migration again, or just create the view:

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

