// Supabase Edge Function to sync products from Airtable to Supabase
// Deploy: supabase functions deploy sync-airtable-products

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const AIRTABLE_PAT = Deno.env.get('AIRTABLE_PAT')!
const AIRTABLE_BASE_ID = 'appA3qQw0NAqz8ru3'
const AIRTABLE_TABLE_ID = 'tbljwWvetx3bScjJ2' // Products table ID
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`

interface AirtableRecord {
  id: string
  fields: Record<string, any>
}

interface AirtableResponse {
  records: AirtableRecord[]
  offset?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all products from Airtable
    const allRecords: AirtableRecord[] = []
    let offset: string | undefined = undefined

    do {
      const url = offset 
        ? `${AIRTABLE_API_URL}?offset=${offset}`
        : AIRTABLE_API_URL

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`)
      }

      const data: AirtableResponse = await response.json()
      allRecords.push(...data.records)
      offset = data.offset
    } while (offset)

    console.log(`Fetched ${allRecords.length} records from Airtable`)

    // Get existing products from Supabase (by airtable_record_id)
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, airtable_record_id')

    if (fetchError) {
      throw fetchError
    }

    const existingMap = new Map(
      existingProducts?.map(p => [p.airtable_record_id, p.id]) || []
    )

    const airtableIds = new Set(allRecords.map(r => r.id))

    // Process each Airtable record
    const operations = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const record of allRecords) {
      const productData = mapAirtableToSupabase(record)
      
      // Validate required fields before processing
      if (!productData.handle || !productData.title) {
        const missingFields = []
        if (!productData.handle) missingFields.push('handle')
        if (!productData.title) missingFields.push('title')
        console.warn(`Skipping product ${record.id}: Missing required fields: ${missingFields.join(', ')}`)
        operations.skipped++
        continue
      }

      const existingId = existingMap.get(record.id)

      if (existingId) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('airtable_record_id', record.id)

        if (error) {
          const errorMsg = `Error updating product ${record.id}: ${error.message}`
          console.error(errorMsg)
          operations.errors.push(errorMsg)
        } else {
          operations.updated++
        }
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert(productData)

        if (error) {
          const errorMsg = `Error creating product ${record.id}: ${error.message}`
          console.error(errorMsg)
          operations.errors.push(errorMsg)
        } else {
          operations.created++
        }
      }
    }

    // Delete products that no longer exist in Airtable
    const toDelete = existingProducts?.filter(
      p => !airtableIds.has(p.airtable_record_id)
    ) || []

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', toDelete.map(p => p.id))

      if (error) {
        console.error('Error deleting products:', error)
      } else {
        operations.deleted = toDelete.length
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        operations,
        total: allRecords.length,
        summary: `${operations.created} created, ${operations.updated} updated, ${operations.deleted} deleted, ${operations.skipped} skipped${operations.errors.length > 0 ? `, ${operations.errors.length} errors` : ''}`,
        ...(operations.errors.length > 0 && { errors: operations.errors.slice(0, 10) }), // Include first 10 errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Sync error:', error)
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

// Map Airtable fields to Supabase schema
function mapAirtableToSupabase(record: AirtableRecord) {
  const fields = record.fields

  // Extract image URLs from attachment fields or dateTime fields (may be incorrectly typed)
  const getImageUrl = (fieldName: string) => {
    const value = fields[fieldName]
    // If it's an array of attachments
    if (Array.isArray(value) && value.length > 0) {
      if (value[0].url) {
        return value[0].url || value[0].thumbnails?.large?.url
      }
    }
    // If it's a string URL
    if (typeof value === 'string' && value.startsWith('http')) {
      return value
    }
    return null
  }

  // Extract tags array from multiple select
  const tags = Array.isArray(fields.Tags) ? fields.Tags : 
               typeof fields.Tags === 'string' ? fields.Tags.split(',').map(t => t.trim()).filter(t => t) : 
               []

  // Parse Published field (might be singleSelect "Yes"/"No" or checkbox true/false)
  const parseBoolean = (value: any, defaultVal: boolean = false): boolean => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      return lower === 'yes' || lower === 'true' || lower === '1' || lower === 'published' || lower === 'active'
    }
    return defaultVal
  }

  // Parse status - normalize to active/draft/archived
  const parseStatus = (value: any): string => {
    if (!value) return 'draft'
    const lower = String(value).toLowerCase()
    if (lower.includes('active') || lower === 'published') return 'active'
    if (lower.includes('archived')) return 'archived'
    return 'draft'
  }

  // Extract primary image (Image Src might be incorrectly typed as dateTime)
  const primaryImage = getImageUrl('Image Src') || getImageUrl('Primary Image') || getImageUrl('primary_image')
  
  // Extract secondary image (Variant Image might be incorrectly typed as dateTime)
  const secondaryImage = getImageUrl('Variant Image') || getImageUrl('Secondary Image') || getImageUrl('secondary_image')

  // Extract handle - try multiple field name variations
  const handle = fields.Handle || fields.handle || fields['Handle'] || null
  
  // Extract title - try multiple field name variations
  const title = fields.Title || fields.title || fields['Title'] || fields.Name || fields.name || null

  return {
    airtable_record_id: record.id,
    handle: handle,
    title: title,
    body_html: fields['Body (HTML)'] || null,
    vendor: fields.Vendor || 'Only at The Kiosk',
    product_category: fields['Product Category'] || null,
    type: fields.Type || null,
    tags: tags.length > 0 ? tags : null,
    published: parseBoolean(fields.Published, false),
    featured: parseBoolean(fields.Featured, false), // Assuming this field exists or will be added
    status: parseStatus(fields.Status || fields.Published),
    variant_sku: fields['Variant SKU'] || null,
    variant_price: fields['Variant Price'] || null,
    variant_compare_at_price: fields['Variant Compare At Price'] || null,
    currency: fields.Currency || 'SEK', // Assuming this field exists or will be added
    variant_requires_shipping: parseBoolean(fields['Variant Requires Shipping'], true),
    variant_taxable: parseBoolean(fields['Variant Taxable'], true),
    primary_image: primaryImage,
    secondary_image: secondaryImage,
    image_alt_text: fields['Image Alt Text'] || null,
    category_display: fields['Category Display'] || null, // Assuming this field exists or will be added
    seo_title: fields['SEO Title'] || null,
    seo_description: fields['SEO Description'] || null,
  }
}

