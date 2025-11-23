# Airtable Products Table Setup Guide

## Overview

This guide explains how to set up the Airtable Products table to store all product data for the Only at The Kiosk website. Products are loaded from Airtable instead of Shopify Storefront API, while Shopify Buy Button handles payments.

## Table Structure

### Table Name: "Products"

### Required Fields

| Field Name | Field Type | Description | Required | Notes |
|------------|-----------|-------------|----------|-------|
| **Product ID** | Single line text | Unique identifier | Yes | Format: `001`, `002`, etc. |
| **Title** | Single line text | Product title | Yes | e.g., "#001 Gold Chain" |
| **Handle** | Single line text | URL-friendly identifier | Yes | Unique, e.g., `001-gold-chain` |
| **Description** | Long text | Product description | No | HTML allowed |
| **Price** | Currency | Product price | Yes | USD format |
| **Images** | Multiple attachments | Product images | Yes | First image is main image |
| **Image URLs** | Long text | Alternative: Image URLs (JSON array) | No | If not using attachments |
| **Variants** | Long text | Product variants (JSON) | No | Size, color options |
| **Collection** | Single select | Product collection | Yes | Options: Bracelets, Chains, Hoodies, T-shirts |
| **Care Instructions** | Long text | Product care guide | No | HTML allowed |
| **Shopify Buy Button ID** | Single line text | Shopify Buy Button ID | Yes | From Shopify Buy Button embed code |
| **Shopify Product ID** | Single line text | Shopify product ID | No | For reference (gid://shopify/Product/...) |
| **Active** | Checkbox | Product is active | Yes | Default: checked |
| **Sort Order** | Number | Display order | No | Lower numbers first |
| **Created Date** | Created time | Auto-generated | Auto | Auto-populated |
| **Last Modified** | Last modified time | Auto-generated | Auto | Auto-populated |

### Optional Fields

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| **Tags** | Multiple select | Product tags | For filtering/search |
| **SKU** | Single line text | Stock keeping unit | For inventory |
| **Weight** | Number | Product weight | For shipping |
| **Dimensions** | Long text | Product dimensions | For shipping |

## Field Details

### Product ID
- **Format**: Sequential numbers (001, 002, 003, etc.)
- **Example**: `001`, `002`, `010`
- **Purpose**: Internal product identifier
- **Unique**: Yes

### Handle
- **Format**: Lowercase, hyphens for spaces
- **Example**: `001-gold-chain`, `001-black-hoodie`
- **Purpose**: URL-friendly identifier, used in product drawer
- **Unique**: Yes (set as unique field in Airtable)
- **Pattern**: `{product-id}-{color/material}-{type}`

### Images
- **Type**: Multiple attachments OR Long text (JSON array)
- **Format**: 
  - Option 1: Upload images directly to Airtable
  - Option 2: Store URLs as JSON: `["https://...", "https://..."]`
- **First Image**: Used as main product image
- **Additional Images**: Used in product gallery

### Variants
- **Type**: Long text (JSON format)
- **Format**:
```json
[
  {
    "id": "variant-1",
    "title": "Small",
    "price": "49.99",
    "available": true
  },
  {
    "id": "variant-2",
    "title": "Medium",
    "price": "49.99",
    "available": true
  }
]
```

### Collection
- **Type**: Single select
- **Options**: 
  - Bracelets
  - Chains
  - Hoodies
  - T-shirts
- **Purpose**: Filter products by collection on collection pages

### Shopify Buy Button ID
- **Format**: Extract from Shopify Buy Button embed code
- **Example**: `1234567890` (numeric ID)
- **How to get**:
  1. Go to Shopify Admin → Apps → Buy Button
  2. Create Buy Button for product
  3. Copy embed code
  4. Extract ID from embed code or data attributes

### Shopify Buy Button Embed Code
- **Type**: Long text
- **Format**: Full HTML embed code from Shopify
- **Alternative**: Store just the ID and generate embed code dynamically

## Setup Steps

### 1. Create Products Table

1. Open your Airtable base
2. Click "+" to add new table
3. Name it "Products"
4. Delete default "Name" field if not needed

### 2. Add Required Fields

Add each field from the Required Fields table above:
1. Click "+" next to field headers
2. Select field type
3. Name the field exactly as specified
4. Configure field options (unique, required, etc.)

### 3. Configure Field Options

**Handle Field:**
- Set as "Unique" (prevent duplicates)
- Set as "Required"

**Collection Field:**
- Set as "Single select"
- Add options: Bracelets, Chains, Hoodies, T-shirts
- Set as "Required"

**Active Field:**
- Set default value to checked (true)

**Price Field:**
- Set currency to USD
- Set as "Required"

### 4. Import Products

**Option A: Manual Entry**
- Add products one by one in Airtable
- Fill in all required fields
- Upload images or add image URLs

**Option B: CSV Import**
- Export products from Shopify (if available)
- Map CSV columns to Airtable fields
- Import CSV file

**Option C: API Import**
- Use Airtable API to bulk import
- Script available in `scripts/import-products-to-airtable.js`

### 5. Set Up Shopify Buy Buttons

For each product:
1. Go to Shopify Admin → Apps → Buy Button
2. Select product
3. Customize button (optional)
4. Copy embed code
5. Extract Buy Button ID
6. Add to Airtable "Shopify Buy Button ID" field

## Data Format Examples

### Example Product Record

```
Product ID: 001
Title: #001 Gold Chain
Handle: 001-gold-chain
Description: Premium gold chain with classic design...
Price: $49.99
Images: [uploaded images or JSON array of URLs]
Variants: [{"id":"small","title":"Small","price":"49.99"},{"id":"medium","title":"Medium","price":"49.99"}]
Collection: Chains
Care Instructions: <ul><li>Store in a dry place</li><li>Avoid contact with chemicals</li></ul>
Shopify Buy Button ID: 1234567890
Active: ✓
Sort Order: 1
```

### Image URLs Format (JSON)

If using Image URLs field instead of attachments:
```json
[
  "https://cdn.shopify.com/s/files/1/001/001-gold-chain-main.jpg",
  "https://cdn.shopify.com/s/files/1/001/001-gold-chain-2.jpg",
  "https://cdn.shopify.com/s/files/1/001/001-gold-chain-3.jpg"
]
```

### Variants Format (JSON)

```json
[
  {
    "id": "small",
    "title": "Small",
    "price": "49.99",
    "currency": "USD",
    "available": true,
    "sku": "001-GC-S"
  },
  {
    "id": "medium",
    "title": "Medium",
    "price": "49.99",
    "currency": "USD",
    "available": true,
    "sku": "001-GC-M"
  },
  {
    "id": "large",
    "title": "Large",
    "price": "49.99",
    "currency": "USD",
    "available": true,
    "sku": "001-GC-L"
  }
]
```

## API Access

### Base ID
- Found in Airtable base URL: `https://airtable.com/app{BaseID}/...`
- Store in environment variable: `AIRTABLE_BASE_ID`

### Access Token
- Generate Personal Access Token in Airtable account settings
- Store in environment variable: `AIRTABLE_ACCESS_TOKEN`
- Required scopes: `data.records:read` (for products)

### Table Name
- Default: "Products"
- Can be overridden via environment variable: `AIRTABLE_PRODUCTS_TABLE`

## Testing

### Verify Table Structure
1. Check all required fields exist
2. Verify field types are correct
3. Test unique constraint on Handle field
4. Test collection dropdown options

### Verify Data
1. Add test product
2. Verify all fields save correctly
3. Test image uploads/URLs
4. Verify JSON fields parse correctly

### Test API Access
```javascript
// Test in browser console
fetch('/api/airtable?table=Products&maxRecords=1')
  .then(r => r.json())
  .then(data => console.log('Products:', data));
```

## Migration from Shopify

If migrating existing Shopify products:

1. Export products from Shopify (CSV or API)
2. Map Shopify fields to Airtable fields:
   - Shopify Title → Airtable Title
   - Shopify Handle → Airtable Handle
   - Shopify Price → Airtable Price
   - Shopify Images → Airtable Images/Image URLs
   - Shopify Description → Airtable Description
   - Shopify Metafield (care_guide) → Airtable Care Instructions
3. Create Buy Buttons in Shopify for each product
4. Add Buy Button IDs to Airtable
5. Import data to Airtable

## Troubleshooting

### Issue: Products not loading
- Check Airtable base ID and access token
- Verify table name matches exactly
- Check field names match (case-sensitive)
- Verify products have "Active" checked

### Issue: Images not displaying
- Verify image URLs are accessible
- Check JSON format if using Image URLs field
- Ensure first image URL is valid

### Issue: Buy Button not working
- Verify Buy Button ID is correct
- Check Shopify Buy Button is active
- Verify product exists in Shopify

## Related Documentation

- [`AIRTABLE_ORDERS_SETUP.md`](AIRTABLE_ORDERS_SETUP.md) - Orders table setup
- [`SHOPIFY_BUY_BUTTON_SETUP.md`](SHOPIFY_BUY_BUTTON_SETUP.md) - Buy Button setup
- [`SHOPIFY_WEBHOOK_SETUP.md`](SHOPIFY_WEBHOOK_SETUP.md) - Webhook setup

