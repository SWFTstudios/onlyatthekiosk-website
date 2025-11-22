 # Shopify CSV Import Guide

## Official Product Upload Template

**File**: `kiosk-shopify-products.csv`

This is the official, tested product upload template for Only at The Kiosk. It has been successfully validated and is ready for import into Shopify.

### Template Features:
- ✅ Formatted to match Shopify's official export template structure
- ✅ All 80 products with variants (360 rows total)
- ✅ Product titles removed from Body (HTML)
- ✅ Care instructions in Care guide metafield (descriptors.care_guide)
- ✅ Valid CDN image URLs for all products
- ✅ Metafield structure matches official template format
- ✅ Ready for successful import into Shopify store

## Overview

This guide explains how to import the product CSV file (`kiosk-shopify-products.csv`) into your Shopify store. The CSV contains all 80 products with their variants, ready for import.

## CSV File Details

- **File**: `kiosk-shopify-products.csv` (Official template - tested and validated)
- **Template Format**: Matches Shopify's latest CSV import template
- **Total Products**: 80
- **Total Rows**: 360 (includes all size variants)
- **Inventory**: 10 units per variant (included in CSV)
- **Care Instructions**: Included in product descriptions
- **Products Included**:
  - 10 Gold Chains (3 sizes each = 30 variants)
  - 10 Silver Chains (3 sizes each = 30 variants)
  - 10 Gold Bracelets (3 sizes each = 30 variants)
  - 10 Silver Bracelets (3 sizes each = 30 variants)
  - 10 Black Hoodies (6 sizes each = 60 variants)
  - 10 White Hoodies (6 sizes each = 60 variants)
  - 10 Black T-shirts (6 sizes each = 60 variants)
  - 10 White T-shirts (6 sizes each = 60 variants)

## Pre-Import Checklist

Before importing, ensure you have:

- [ ] Created all collections in Shopify Admin:
  - [ ] Bracelets
  - [ ] Chains
  - [ ] Hoodies
  - [ ] T-shirts
  - [ ] Gold Bracelets (sub-collection or tag-based)
  - [ ] Silver Bracelets (sub-collection or tag-based)
  - [ ] Gold Chains (sub-collection or tag-based)
  - [ ] Silver Chains (sub-collection or tag-based)
- [ ] Product images ready (currently using placeholder: `images/kiosk-placeholder-product-img.webp`)
- [ ] Shopify Admin access to `onlyatthekiosk.com`

## Import Steps

### Step 1: Prepare the CSV File

1. Open `kiosk-shopify-products.csv` in a spreadsheet application (Excel, Google Sheets, Numbers)
2. Review the data to ensure everything looks correct
3. **Important**: Update image paths if you have product images ready
   - Replace `images/kiosk-placeholder-product-img.webp` with actual image URLs
   - Images can be:
     - Full URLs (e.g., `https://cdn.shopify.com/s/files/1/.../image.jpg`)
     - Relative paths (if images are uploaded to Shopify Files)
     - Or upload images after import and update in Shopify Admin

### Step 2: Import to Shopify

1. Go to **Shopify Admin** → **Products** → **All products**
2. Click **"Import"** button (top right)
3. Click **"Add file"** and select `shopify-products-import.csv`
4. Review the import preview:
   - Check that products are recognized correctly
   - Verify variants are showing (Size options)
   - Confirm prices are correct
5. Click **"Import products"**
6. Wait for import to complete (may take a few minutes for 360 rows)

### Step 3: Verify Smart Collection Assignment

The CSV uses tags that match your smart collection conditions. Products should automatically appear in collections:

**Tag Structure:**
- **Gold Chains**: Tags = `Gold, Chains` → Appears in "Chains" and "Gold Chains" collections
- **Silver Chains**: Tags = `Silver, Chains` → Appears in "Chains" and "Silver Chains" collections
- **Gold Bracelets**: Tags = `Gold, Bracelets` → Appears in "Bracelets" and "Gold Bracelets" collections
- **Silver Bracelets**: Tags = `Silver, Bracelets` → Appears in "Bracelets" and "Silver Bracelets" collections
- **Hoodies**: Tags = `Hoodies` → Appears in "Hoodies" collection
- **T-Shirts**: Tags = `T-Shirts` → Appears in "T-Shirts" collection

**Verify Collections:**
1. Go to **Products** → **Collections**
2. Check each collection to ensure products appear:
   - **Gold Bracelets**: Should show 10 products (tags: "Gold" AND "Bracelets")
   - **Silver Chains**: Should show 10 products (tags: "Silver" AND "Chains")
   - **Gold Chains**: Should show 10 products (tags: "Gold" AND "Chains")
   - **Hoodies**: Should show 20 products (tags: "Hoodies")
   - **T-Shirts**: Should show 20 products (tags: "T-Shirts")
   - **Bracelets**: Should show 20 products (tags: "Bracelets")
   - **Chains**: Should show 20 products (tags: "Chains")

If products don't appear, verify your smart collection conditions match the tag format.

### Step 4: Verify Inventory Quantities

✅ **Inventory is already set in the CSV!** Each variant has 10 units.

However, verify after import:

1. Go to **Products** → **All products**
2. Check a few products to confirm inventory is set to 10
3. If inventory shows 0, use bulk editor:
   - Select all products
   - Click **"Edit products"**
   - Set **"Quantity"** to **10** for all variants
   - Click **"Save"**

### Step 5: Update Product Images

Currently, all products use placeholder image: `images/kiosk-placeholder-product-img.webp`

**To add real product images:**

1. **Option A: Upload to Shopify Files**
   - Go to **Settings** → **Files**
   - Upload product images
   - Copy image URLs
   - Update CSV and re-import (or update manually in Admin)

2. **Option B: Update in Shopify Admin**
   - Go to each product
   - Click **"Add image"**
   - Upload product images
   - Set primary image (first image)

3. **Option C: Use Image URLs**
   - If images are hosted elsewhere (CDN, etc.)
   - Update the `Image Src` column in CSV with full URLs
   - Re-import or update manually

### Step 6: Care Instructions (Already Included)

✅ **Care instructions are included in product descriptions!**

The CSV includes care instructions and delivery information directly in the product descriptions (HTML format). This means:
- Care instructions are visible on product pages
- No need to add metafields for care instructions
- All products have consistent care and delivery information

**Optional: Add as Metafields** (if you want to use them programmatically):
If you want to access care instructions via the Storefront API as metafields, you can add them separately:
1. Go to **Settings** → **Custom data** → **Products**
2. Create metafield: `custom.care_instructions` (rich text)
3. Create metafield: `custom.delivery` (text)
4. Copy care instructions from descriptions to metafields (or use bulk import)

### Step 7: Verify Import

After import, verify:

- [ ] All 80 products imported successfully
- [ ] All variants (sizes) are present
- [ ] Products are assigned to correct collections
- [ ] Prices are correct
- [ ] Inventory quantities are set (10 per variant)
- [ ] Product descriptions are showing correctly
- [ ] Images are uploaded (or placeholder is acceptable)
- [ ] Product handles match expected format (e.g., `001-gold-chain`)

## CSV Column Reference

Key columns in the CSV (matching Shopify's latest template):

- **Title**: Product name (e.g., "#001 Gold Chain")
- **URL handle**: Unique product identifier (e.g., "001-gold-chain")
- **Description**: Product description with care instructions and delivery info (HTML)
- **Vendor**: "The Kiosk"
- **Type**: Product type (Chains, Bracelets, Hoodies, T-shirts)
- **Tags**: Collection tags (separate tags for smart collections):
  - Gold Chains: `Gold, Chains`
  - Silver Bracelets: `Silver, Bracelets`
  - Hoodies: `Hoodies`
  - T-Shirts: `T-Shirts`
- **Published on online store**: "TRUE"
- **Status**: "active"
- **SKU**: Unique SKU per variant (e.g., "001-gold-chain-small")
- **Option1 name**: "Size"
- **Option1 value**: Size variant (Small, Medium, Large, XS, S, M, L, XL, XXL)
- **Price**: Product price (e.g., "79.99")
- **Inventory quantity**: "10" (units per variant)
- **Product image URL**: Image path/URL (currently placeholder)

## Troubleshooting

### Import Errors

**"Invalid handle" error:**
- Handles must be lowercase, hyphenated, no spaces
- All handles in CSV follow this format ✓

**"Duplicate handle" error:**
- Product with same handle already exists
- Delete existing product or change handle in CSV

**"Invalid variant option" error:**
- Check that Option1 Name is "Size" (case-sensitive)
- Verify Option1 Value matches expected sizes

**"Image not found" error:**
- Image paths in CSV don't exist
- Upload images to Shopify Files first, or use full URLs
- Or update images after import in Shopify Admin

### Collection Assignment Issues

**Products not showing in collections:**
- Verify tags match collection conditions
- Check that collections are set to "Automated" with correct conditions
- Or manually add products to collections

### Inventory Issues

**Inventory not showing:**
- Inventory quantities are included in CSV (10 per variant)
- If inventory shows 0 after import, use bulk editor to update
- Verify "Inventory tracker" is set to "shopify" in CSV

## Post-Import Tasks

After successful import:

1. ✅ Verify inventory quantities (should be 10 per variant from CSV)
2. ✅ Upload/update product images (replace placeholder)
3. ✅ Verify smart collection assignments (products should auto-appear)
4. ✅ Test product pages on your website
5. ✅ Test collection pages (e.g., `carousel-template.html?collection=bracelets`)
6. ✅ Verify product handles match website expectations
7. ✅ (Optional) Add care instructions as metafields if needed for API access

## Next Steps

1. Import the CSV file
2. Set inventory quantities
3. Upload product images
4. Test collection pages on your website
5. Verify products appear correctly in carousel

## Support

If you encounter issues:
- Check Shopify import logs for specific errors
- Verify CSV format matches Shopify requirements
- Ensure all required fields are filled
- Check that collections exist before assigning products

---

**Last Updated**: January 2025  
**CSV Version**: 1.0  
**Total Products**: 80  
**Total Variants**: 360

