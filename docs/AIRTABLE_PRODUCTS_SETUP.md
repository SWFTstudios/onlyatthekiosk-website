# Airtable Products Table Setup Guide

## Overview

This guide explains how to set up the Airtable Products table to match the exact structure of `kiosk-shopify-products.csv`. The table will store all product data for the Only at The Kiosk website, with products loaded from Airtable while Shopify Buy Button handles payments.

## Table Structure

### Table Name: "Products"

**Airtable Configuration:**
- **Base ID**: `appA3qQw0NAqz8ru3`
- **Table ID**: `tblY2SEY8FTMUo6HU`
- **Table Name**: `Products`
- **View URL**: https://airtable.com/appA3qQw0NAqz8ru3/tblY2SEY8FTMUo6HU/viw9yJb2c1mrWd5zN

**Important**: The CSV has multiple rows per product (one per variant). In Airtable, you can either:
- **Option A**: Store one record per product with variants in a JSON field
- **Option B**: Store one record per variant (matching CSV structure exactly)

This guide uses **Option B** to match the CSV structure exactly.

## Field Mapping (Matching CSV Headers)

### Column 1-10: Basic Product Information

| CSV Column | Airtable Field Name | Field Type | Description | Required | Notes |
|------------|---------------------|-----------|-------------|----------|-------|
| **Handle** | Handle | Single line text | URL-friendly identifier | Yes | Unique, e.g., `001-gold-chain` |
| **Title** | Title | Single line text | Product title | Yes | e.g., "#001 Gold Chain" |
| **Body (HTML)** | Body (HTML) | Long text | Product description | No | HTML allowed |
| **Vendor** | Vendor | Single line text | Product vendor | No | Default: "The Kiosk" |
| **Product Category** | Product Category | Single line text | Category path | No | For organization |
| **Type** | Type | Single line text | Product type | No | e.g., "Chains", "Bracelets" |
| **Tags** | Tags | Multiple select | Product tags | No | Options: "Gold", "Silver", "Chains", "Bracelets", "Hoodies", "T-Shirts" |
| **Published** | Published | Checkbox | Product is published | Yes | Default: checked |
| **Option1 Name** | Option1 Name | Single line text | First option name | No | e.g., "Size" |
| **Option1 Value** | Option1 Value | Single line text | First option value | No | e.g., "Small", "Medium", "Large" |

### Column 11-17: Additional Options

| CSV Column | Airtable Field Name | Field Type | Description | Required | Notes |
|------------|---------------------|-----------|-------------|----------|-------|
| **Option1 Linked To** | Option1 Linked To | Single line text | Linked product | No | Usually empty |
| **Option2 Name** | Option2 Name | Single line text | Second option name | No | Usually empty |
| **Option2 Value** | Option2 Value | Single line text | Second option value | No | Usually empty |
| **Option2 Linked To** | Option2 Linked To | Single line text | Linked product | No | Usually empty |
| **Option3 Name** | Option3 Name | Single line text | Third option name | No | Usually empty |
| **Option3 Value** | Option3 Value | Single line text | Third option value | No | Usually empty |
| **Option3 Linked To** | Option3 Linked To | Single line text | Linked product | No | Usually empty |

### Column 18-25: Variant Information

| CSV Column | Airtable Field Name | Field Type | Description | Required | Notes |
|------------|---------------------|-----------|-------------|----------|-------|
| **Variant SKU** | Variant SKU | Single line text | Stock keeping unit | No | e.g., "001-gold-chain-small" |
| **Variant Grams** | Variant Grams | Number | Weight in grams | No | Decimal allowed |
| **Variant Inventory Tracker** | Variant Inventory Tracker | Single select | Inventory tracking method | No | Options: "shopify", "" (empty) |
| **Variant Inventory Policy** | Variant Inventory Policy | Single select | Inventory policy | No | Options: "deny", "continue" |
| **Variant Fulfillment Service** | Variant Fulfillment Service | Single select | Fulfillment service | No | Options: "manual", "" (empty) |
| **Variant Price** | Variant Price | Currency | Product price | Yes | USD format, e.g., 79.99 |
| **Variant Compare At Price** | Variant Compare At Price | Currency | Original/compare price | No | For sale prices |
| **Variant Requires Shipping** | Variant Requires Shipping | Checkbox | Requires shipping | Yes | Default: checked |

### Column 26-30: Shipping & Tax

| CSV Column | Airtable Field Name | Field Type | Description | Required | Notes |
|------------|---------------------|-----------|-------------|----------|-------|
| **Variant Taxable** | Variant Taxable | Checkbox | Product is taxable | Yes | Default: checked |
| **Unit Price Total Measure** | Unit Price Total Measure | Number | Unit price measure | No | Usually empty |
| **Unit Price Total Measure Unit** | Unit Price Total Measure Unit | Single line text | Unit measure unit | No | Usually empty |
| **Unit Price Base Measure** | Unit Price Base Measure | Number | Base measure | No | Usually empty |
| **Unit Price Base Measure Unit** | Unit Price Base Measure Unit | Single line text | Base measure unit | No | Usually empty |
| **Variant Barcode** | Variant Barcode | Single line text | Product barcode | No | Usually empty |

### Column 31-35: Images

| CSV Column | Airtable Field Name | Field Type | Description | Required | Notes |
|------------|---------------------|-----------|-------------|----------|-------|
| **Image Src** | Image Src | Attachment | Primary product image | Yes | Upload image or use URL |
| **Image Position** | Image Position | Number | Image order | No | 1, 2, 3... |
| **Image Alt Text** | Image Alt Text | Single line text | Image alt text | No | For accessibility |
| **Gift Card** | Gift Card | Checkbox | Is gift card | No | Default: unchecked |
| **SEO Title** | SEO Title | Single line text | SEO meta title | No | For search engines |

### Column 36-43: SEO & Care Instructions

| CSV Column | Airtable Field Name | Field Type | Description | Required | Notes |
|------------|---------------------|-----------|-------------|----------|-------|
| **SEO Description** | SEO Description | Long text | SEO meta description | No | For search engines |
| **Care guide (product.metafields.descriptors.care_guide)** | Care guide (product.metafields.descriptors.care_guide) | Long text | Care instructions | No | HTML allowed, detailed list |
| **Care instructions (product.metafields.shopify.care-instructions)** | Care instructions (product.metafields.shopify.care-instructions) | Long text | Alternative care instructions | No | Usually empty |
| **Variant Image** | Variant Image | Attachment | Variant-specific image | No | Usually empty |
| **Variant Weight Unit** | Variant Weight Unit | Single line text | Weight unit | No | Options: "g", "kg", "oz", "lb" |
| **Variant Tax Code** | Variant Tax Code | Single line text | Tax code | No | Usually empty |
| **Cost per item** | Cost per item | Number | Product cost | No | For profit calculation |
| **Status** | Status | Single select | Product status | Yes | Options: "active", "draft", "archived" |

## Additional Fields (Not in CSV but Recommended)

| Field Name | Field Type | Description | Required | Notes |
|------------|-----------|-------------|----------|-------|
| **Shopify Buy Button ID** | Single line text | Shopify Buy Button ID | Yes | From Shopify Buy Button embed code |
| **Shopify Product ID** | Single line text | Shopify product ID | No | For reference (gid://shopify/Product/...) |
| **Collection** | Single select | Product collection | Yes | Options: Bracelets, Chains, Hoodies, T-shirts |
| **Active** | Checkbox | Product is active | Yes | Default: checked |
| **Sort Order** | Number | Display order | No | Lower numbers first |
| **Created Date** | Created time | Auto-generated | Auto | Auto-populated |
| **Last Modified** | Last modified time | Auto-generated | Auto | Auto-populated |

## Setup Steps

### 1. Create Products Table

1. Open your Airtable base
2. Click "+" to add new table
3. Name it "Products"
4. Delete default "Name" field if not needed

### 2. Add All Fields (In CSV Order)

Add each field from the mapping table above:
1. Click "+" next to field headers
2. Select the correct field type
3. Name the field **exactly** as specified (case-sensitive, including spaces and parentheses)
4. Configure field options (unique, required, default values, etc.)

### 3. Configure Field Options

**Handle Field:**
- Set as "Unique" (prevent duplicates)
- Set as "Required"

**Tags Field:**
- Set as "Multiple select"
- Add options: "Gold", "Silver", "Chains", "Bracelets", "Hoodies", "T-Shirts"
- These match the tags in your CSV

**Published Field:**
- Set as "Checkbox"
- Set default value to checked (true)

**Variant Inventory Tracker Field:**
- Set as "Single select"
- Add options: "shopify", "" (empty string option)
- Allow custom values: No

**Variant Inventory Policy Field:**
- Set as "Single select"
- Add options: "deny", "continue"
- Allow custom values: No

**Variant Fulfillment Service Field:**
- Set as "Single select"
- Add options: "manual", "" (empty string option)
- Allow custom values: No

**Variant Price Field:**
- Set as "Currency"
- Set currency to USD
- Set as "Required"

**Variant Compare At Price Field:**
- Set as "Currency"
- Set currency to USD

**Variant Requires Shipping Field:**
- Set as "Checkbox"
- Set default value to checked (true)

**Variant Taxable Field:**
- Set as "Checkbox"
- Set default value to checked (true)

**Image Src Field:**
- Set as "Attachment"
- Allow multiple files: Yes (for product gallery)
- First attachment is main image

**Variant Image Field:**
- Set as "Attachment"
- Allow multiple files: No
- Usually empty, but available for variant-specific images

**Gift Card Field:**
- Set as "Checkbox"
- Set default value to unchecked (false)

**Status Field:**
- Set as "Single select"
- Add options: "active", "draft", "archived"
- Set default to "active"
- Allow custom values: No

**Collection Field (Additional):**
- Set as "Single select"
- Add options: "Bracelets", "Chains", "Hoodies", "T-shirts"
- Set as "Required"
- This is derived from Tags or Type field

### 4. Import Products from CSV

**Option A: Direct CSV Import**
1. In Airtable, click "Import data" → "CSV file"
2. Upload `kiosk-shopify-products.csv`
3. Map CSV columns to Airtable fields (should auto-match if field names match exactly)
4. Review and import

**Option B: Manual Entry**
- Add products one by one in Airtable
- Fill in all required fields
- Upload images or add image URLs

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

### Example Product Record (Matching CSV Row)

```
Handle: 001-gold-chain
Title: #001 Gold Chain
Body (HTML): <p>Bold, raw and refined...</p>
Vendor: The Kiosk
Product Category: (empty)
Type: Chains
Tags: Gold, Chains
Published: ✓ (checked)
Option1 Name: Size
Option1 Value: Small
Option1 Linked To: (empty)
Option2 Name: (empty)
Option2 Value: (empty)
Option2 Linked To: (empty)
Option3 Name: (empty)
Option3 Value: (empty)
Option3 Linked To: (empty)
Variant SKU: 001-gold-chain-small
Variant Grams: 0
Variant Inventory Tracker: shopify
Variant Inventory Policy: deny
Variant Fulfillment Service: manual
Variant Price: $79.99
Variant Compare At Price: (empty)
Variant Requires Shipping: ✓ (checked)
Variant Taxable: ✓ (checked)
Unit Price Total Measure: (empty)
Unit Price Total Measure Unit: (empty)
Unit Price Base Measure: (empty)
Unit Price Base Measure Unit: (empty)
Variant Barcode: (empty)
Image Src: [uploaded image or URL]
Image Position: 1.0
Image Alt Text: #001 Gold Chain
Gift Card: ✗ (unchecked)
SEO Title: #001 Gold Chain
SEO Description: Shop #001 Gold Chain at Only at The Kiosk...
Care guide (product.metafields.descriptors.care_guide): Store in a cool, dry place...
Care instructions (product.metafields.shopify.care-instructions): (empty)
Variant Image: (empty)
Variant Weight Unit: g
Variant Tax Code: (empty)
Cost per item: (empty)
Status: active
```

### Image URLs Format

If using Image Src as Attachment:
- Upload images directly to Airtable
- First image is main product image
- Additional images are gallery images

If using Image Src as URL (Long text):
- Store full URL: `https://cdn.prod.website-files.com/68cc5218804d49fba2fc73a1/69223bf1fd1b5ee76eac1e08_kiosk-placeholder-product-img.webp`

### Care Instructions Format

The Care guide field should contain a detailed list without a title:
```
Store in a cool, dry place when not in use
Avoid contact with harsh chemicals, perfumes, or lotions
Clean gently with a soft, dry cloth
Remove before swimming or showering
Store separately to prevent scratching
For gold pieces, use appropriate cleaning solution if needed
Polish regularly to maintain shine
Avoid exposure to extreme temperatures
Keep away from abrasive surfaces
```

## Field Type Reference

### Text Fields
- **Single line text**: Handle, Title, Vendor, SKU, etc.
- **Long text**: Body (HTML), SEO Description, Care guide

### Number Fields
- **Number**: Variant Grams, Image Position, Cost per item
- **Currency**: Variant Price, Variant Compare At Price

### Selection Fields
- **Single select**: Type, Variant Inventory Tracker, Status, Collection
- **Multiple select**: Tags

### Boolean Fields
- **Checkbox**: Published, Variant Requires Shipping, Variant Taxable, Gift Card, Active

### Media Fields
- **Attachment**: Image Src, Variant Image

### Auto Fields
- **Created time**: Created Date
- **Last modified time**: Last Modified

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
1. Check all 43 fields exist (matching CSV columns)
2. Verify field types are correct
3. Test unique constraint on Handle field
4. Test dropdown options (Tags, Status, Collection, etc.)

### Verify Data
1. Import test products from CSV
2. Verify all fields save correctly
3. Test image uploads/URLs
4. Verify checkbox fields work correctly
5. Verify currency fields format correctly

### Test API Access
```javascript
// Test in browser console
fetch('/api/airtable?table=Products&maxRecords=1')
  .then(r => r.json())
  .then(data => console.log('Products:', data));
```

## Migration from CSV

### Step 1: Prepare CSV
- Ensure CSV matches `kiosk-shopify-products.csv` format exactly
- Verify all column headers match Airtable field names
- Check data types are correct

### Step 2: Import to Airtable
1. In Airtable, click "Import data" → "CSV file"
2. Upload `kiosk-shopify-products.csv`
3. Map columns (should auto-match)
4. Review data types
5. Import

### Step 3: Post-Import Tasks
1. Add "Shopify Buy Button ID" for each product
2. Set "Collection" field based on Tags or Type
3. Verify images uploaded correctly
4. Check all required fields are filled

## Troubleshooting

### Issue: CSV import fails
- Check field names match exactly (case-sensitive, including spaces)
- Verify field types are correct
- Ensure required fields have data

### Issue: Products not loading
- Check Airtable base ID and access token
- Verify table name matches exactly
- Check field names match (case-sensitive)
- Verify products have "Published" checked and "Status" = "active"

### Issue: Images not displaying
- Verify Image Src field is Attachment type
- Check image URLs are accessible (if using URLs)
- Ensure first image is valid

### Issue: Variants not showing
- Check Option1 Name and Option1 Value fields
- Verify Variant Price is set
- Ensure Variant SKU is unique

### Issue: Buy Button not working
- Verify Buy Button ID is correct
- Check Shopify Buy Button is active
- Verify product exists in Shopify

## Related Documentation

- [`AIRTABLE_ORDERS_SETUP.md`](AIRTABLE_ORDERS_SETUP.md) - Orders table setup
- [`SHOPIFY_BUY_BUTTON_SETUP.md`](SHOPIFY_BUY_BUTTON_SETUP.md) - Buy Button setup
- [`SHOPIFY_WEBHOOK_SETUP.md`](SHOPIFY_WEBHOOK_SETUP.md) - Webhook setup
