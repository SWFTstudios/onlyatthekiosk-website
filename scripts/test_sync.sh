#!/bin/bash
# Test Sync Function Script

SUPABASE_URL="https://aszjrkqvkewoykteczxf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzempya3F2a2V3b3lrdGVjenhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5OTEsImV4cCI6MjA3OTIwODk5MX0.7KnXY1W2t6WwBilIJwJA6lfVqU913SJK6NmSCk6yfUk"

echo "🔄 Testing Airtable → Supabase sync..."
echo ""

# Test sync function
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/sync-airtable-products" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📊 Sync Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Query products to verify sync
echo "📦 Checking synced products..."
echo ""

PRODUCTS=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/products?select=*&limit=5" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

echo "Products in Supabase:"
echo "$PRODUCTS" | jq '.' 2>/dev/null || echo "$PRODUCTS"
echo ""

STORE_PRODUCTS=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/store_products?select=*&limit=5" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

echo "Store Products View:"
echo "$STORE_PRODUCTS" | jq '.' 2>/dev/null || echo "$STORE_PRODUCTS"

