// Supabase Edge Function to sync products from Shopify webhooks to Supabase
// Deploy: supabase functions deploy sync-shopify-product

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || ''
const VERIFY_WEBHOOK = Deno.env.get('VERIFY_WEBHOOK') !== 'false' // Verify by default

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  body_html: string | null
  vendor: string
  product_type: string
  tags: string
  status: 'active' | 'archived' | 'draft'
  variants: Array<{
    id: number
    price: string
    compare_at_price: string | null
    sku: string | null
    requires_shipping: boolean
    taxable: boolean
  }>
  images: Array<{
    id: number
    src: string
    alt: string | null
    position: number
  }>
  created_at: string
  updated_at: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-shop-domain, x-shopify-hmac-sha256, x-shopify-topic',
}

// Verify Shopify webhook HMAC signature
async function verifyWebhook(body: string, hmac: string): Promise<boolean> {
  if (!VERIFY_WEBHOOK || !SHOPIFY_WEBHOOK_SECRET) {
    console.warn('Webhook verification disabled or secret not set')
    return true
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(body)
    const key = encoder.encode(SHOPIFY_WEBHOOK_SECRET)
    
    const hash = await createHmac('sha256', key)
      .update(data)
      .digest('hex')
    
    return hash === hmac
  } catch (error) {
    console.error('Error verifying webhook:', error)
    return false
  }
}

// Map Shopify product to Supabase schema
function mapShopifyToSupabase(product: ShopifyProduct, eventType: string) {
  const variant = product.variants[0] || product.variants // Use first variant
  const primaryImage = product.images.find(img => img.position === 1) || product.images[0]
  const secondaryImage = product.images.find(img => img.position === 2) || product.images[1]

  // Parse tags (comma-separated string)
  const tags = product.tags ? product.tags.split(',').map(t => t.trim()).filter(t => t) : []

  return {
    shopify_product_id: product.id.toString(),
    handle: product.handle || null,
    title: product.title || null,
    body_html: product.body_html || null,
    vendor: product.vendor || 'Only at The Kiosk',
    product_category: null, // Shopify doesn't have this directly
    type: product.product_type || null,
    tags: tags.length > 0 ? tags : null,
    published: product.status === 'active',
    featured: false, // Default, can be set via tags or metadata
    status: product.status === 'active' ? 'active' : 
            product.status === 'archived' ? 'archived' : 'draft',
    variant_sku: variant?.sku || null,
    variant_price: variant ? parseFloat(variant.price) : null,
    variant_compare_at_price: variant && variant.compare_at_price ? 
                             parseFloat(variant.compare_at_price) : null,
    currency: 'SEK', // Default, adjust based on your store
    variant_requires_shipping: variant?.requires_shipping !== false,
    variant_taxable: variant?.taxable !== false,
    primary_image: primaryImage?.src || null,
    secondary_image: secondaryImage?.src || null,
    image_alt_text: primaryImage?.alt || null,
    category_display: null, // Can be set via tags or metadata
    seo_title: null, // Shopify SEO data would need to be fetched separately
    seo_description: null,
    // Don't update airtable_record_id if it exists (preserve Airtable sync)
    // Only set if this product doesn't exist yet
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get webhook headers
    const hmac = req.headers.get('x-shopify-hmac-sha256') || ''
    const topic = req.headers.get('x-shopify-topic') || ''
    const shopDomain = req.headers.get('x-shopify-shop-domain') || ''
    
    // Get request body
    const body = await req.text()

    // Verify webhook (if enabled)
    if (!await verifyWebhook(body, hmac)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook signature' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Parse Shopify product data
    const product: ShopifyProduct = JSON.parse(body)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different webhook events
    if (topic.includes('delete')) {
      // Delete product from Supabase
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('shopify_product_id', product.id.toString())

      if (error) {
        console.error('Error deleting product:', error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Product deleted',
          product_id: product.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle create/update
    const productData = mapShopifyToSupabase(product, topic)

    // Check if product exists (by shopify_product_id)
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, shopify_product_id')
      .eq('shopify_product_id', product.id.toString())
      .single()

    if (existingProduct) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('shopify_product_id', product.id.toString())

      if (error) {
        console.error('Error updating product:', error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Product updated',
          operation: 'updated',
          product_id: product.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      // Create new product
      // Only set shopify_product_id, don't overwrite airtable_record_id if it exists
      const { error } = await supabase
        .from('products')
        .insert(productData)

      if (error) {
        console.error('Error creating product:', error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Product created',
          operation: 'created',
          product_id: product.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

