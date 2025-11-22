# Shopify Product Setup Guide

## Overview

This guide walks you through setting up test products in your Shopify store for development and testing. These products will be used to populate the carousel, store page, and collection pages on the Only at The Kiosk website.

## Prerequisites

- Shopify Admin access to `onlyatthekiosk.com`
- Basic understanding of Shopify product management
- Product images ready (at least 1 per product, ideally 3-5)

---

## Step 1: Create Collections

Before adding products, create the collections that will organize them:

### Collections to Create

1. **Bracelets**
   - Handle: `bracelets` (auto-generated from title)
   - Description: "Bold, raw and refined. Each piece crafted for the multi-sport rebel."

2. **Chains**
   - Handle: `chains` (auto-generated from title)
   - Description: "Bold, raw and refined. Each piece crafted for the multi-sport rebel."

3. **Hoodies**
   - Handle: `hoodies` (auto-generated from title)
   - Description: "Graphic tees built for risk, style and story."

4. **T-shirts**
   - Handle: `t-shirts` (auto-generated from title)
   - Description: "Graphic tees built for risk, style and story."

### How to Create Collections

1. Go to **Shopify Admin** → **Products** → **Collections**
2. Click **"Create collection"**
3. Enter collection title (e.g., "Bracelets")
4. Add description (optional but recommended)
5. Set collection type:
   - **Manual**: You manually add products
   - **Automated**: Products are added based on conditions (e.g., product type, tags)
6. Click **"Save"**
7. Note the collection handle (visible in the URL: `/admin/collections/bracelets`)

---

## Step 2: Create Products

### Recommended Product Structure

For each product, you'll need:

- **Title**: Product name (e.g., "Chain Model X – Matte Black")
- **Description**: Rich text description of the product
- **Price**: Product price
- **Images**: At least 1 image, ideally 3-5 images
- **Variants**: Size, color, material options (if applicable)
- **Collections**: Assign to appropriate collection(s)
- **Metafields**: Care instructions (rich text), delivery info (text)

### Product Examples

#### Bracelets Collection

1. **Product 1**: "Bracelet Model A – Weathered Silver"
   - Handle: `bracelet-model-a-weathered-silver`
   - Price: $49.99
   - Variants: Size (Small, Medium, Large)
   - Collection: Bracelets

2. **Product 2**: "Bracelet Model B – Matte Black"
   - Handle: `bracelet-model-b-matte-black`
   - Price: $54.99
   - Variants: Size (Small, Medium, Large)
   - Collection: Bracelets

#### Chains Collection

1. **Product 3**: "Chain Model X – Matte Black"
   - Handle: `chain-model-x-matte-black`
   - Price: $79.99
   - Variants: Length (18", 20", 22")
   - Collection: Chains

2. **Product 4**: "Chain Model Y – Polished Silver"
   - Handle: `chain-model-y-polished-silver`
   - Price: $89.99
   - Variants: Length (18", 20", 22")
   - Collection: Chains

#### Hoodies Collection

1. **Product 5**: "Kiosk Logo Hoodie – Black"
   - Handle: `kiosk-logo-hoodie-black`
   - Price: $89.99
   - Variants: Size (S, M, L, XL)
   - Collection: Hoodies

2. **Product 6**: "Kiosk Logo Hoodie – Grey"
   - Handle: `kiosk-logo-hoodie-grey`
   - Price: $89.99
   - Variants: Size (S, M, L, XL)
   - Collection: Hoodies

#### T-shirts Collection

1. **Product 7**: "Kiosk Graphic Tee – White"
   - Handle: `kiosk-graphic-tee-white`
   - Price: $39.99
   - Variants: Size (S, M, L, XL)
   - Collection: T-shirts

2. **Product 8**: "Kiosk Graphic Tee – Black"
   - Handle: `kiosk-graphic-tee-black`
   - Price: $39.99
   - Variants: Size (S, M, L, XL)
   - Collection: T-shirts

### How to Create a Product

1. Go to **Shopify Admin** → **Products** → **All products**
2. Click **"Add product"**
3. Fill in product details:
   - **Title**: Enter product name
   - **Description**: Add rich text description
   - **Media**: Upload product images (drag and drop or click to upload)
   - **Pricing**: Enter price
   - **Inventory**: Set inventory tracking (optional for testing)
   - **Shipping**: Add weight and dimensions (optional)
   - **Variants**: Add size, color, or other options
   - **Search engine listing**: Edit handle if needed (auto-generated from title)
   - **Collections**: Select collection(s) to add product to
4. Click **"Save product"**
5. **Note the product handle** (visible in the URL: `/admin/products/bracelet-model-a-weathered-silver`)

---

## Step 3: Set Up Metafields

Metafields allow you to store additional product information that will be displayed in the product drawer.

### Metafields to Create

1. **Care Instructions** (Rich text)
   - Namespace: `custom`
   - Key: `care_instructions`
   - Type: Rich text
   - Description: "Product care and maintenance instructions"

2. **Delivery Info** (Text)
   - Namespace: `custom`
   - Key: `delivery`
   - Type: Single line text
   - Description: "Delivery and shipping information"

### How to Create Metafields

1. Go to **Shopify Admin** → **Settings** → **Custom data** → **Products**
2. Click **"Add definition"**
3. Configure metafield:
   - **Name**: "Care Instructions"
   - **Namespace and key**: `custom.care_instructions`
   - **Type**: Rich text
   - **Description**: "Product care and maintenance instructions"
4. Click **"Save"**
5. Repeat for "Delivery Info" (single line text)

### How to Add Metafield Values to Products

1. Go to a product in **Shopify Admin** → **Products**
2. Scroll down to the **Metafields** section
3. Click **"Add metafield"** or edit existing metafield
4. Select the metafield (e.g., "Care Instructions")
5. Enter the value:
   - **Care Instructions**: Rich text (e.g., "Hand wash only. Do not bleach. Air dry.")
   - **Delivery Info**: Text (e.g., "Free shipping in the EU. Limited stock.")
6. Click **"Save"**

---

## Step 4: Verify Product Handles

Product handles are used in the frontend to fetch product data. Verify each product has a clean, SEO-friendly handle.

### How to Check Product Handles

1. Go to **Shopify Admin** → **Products** → Select a product
2. Scroll to **Search engine listing** section
3. Click **"Edit website SEO"**
4. Check the **URL and handle** field
5. The handle should be:
   - Lowercase
   - Hyphenated (no spaces)
   - SEO-friendly (e.g., `bracelet-model-a-weathered-silver`)

### How to Update Product Handles

1. In the **Search engine listing** section, click **"Edit website SEO"**
2. Update the **URL and handle** field
3. Click **"Save"**

---

## Step 5: Test Product Data

After creating products, verify they can be accessed via the Storefront API:

### Using Shopify GraphiQL Explorer

1. Go to **Shopify Admin** → **Settings** → **Apps and sales channels** → **Develop apps**
2. Click on your Storefront API app (or create one if it doesn't exist)
3. Click **"Open GraphiQL explorer"**
4. Test a query:

```graphql
query {
  products(first: 5) {
    edges {
      node {
        id
        title
        handle
        description
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        metafields(identifiers: [
          {namespace: "custom", key: "care_instructions"},
          {namespace: "custom", key: "delivery"}
        ]) {
          namespace
          key
          value
          type
        }
      }
    }
  }
}
```

5. Verify the response includes your products with correct data

---

## Step 6: Update Frontend Product Handles

Once products are created, update the frontend to use real product handles:

### Files to Update

1. **`carousel-template.html`**:
   - Replace placeholder `data-product-handle` attributes with real handles
   - Example: `data-product-handle="bracelet-model-a-weathered-silver"`

2. **`store.html`**:
   - Update featured product links to use real handles

3. **Collection Pages** (`shop-bracelets-chains.html`, `shop-tshirts-hoodies.html`):
   - Update product listings to use real handles

---

## Quick Reference: Product Handle Format

Product handles should follow this format:
- Lowercase
- Hyphenated (spaces become hyphens)
- No special characters (except hyphens)
- SEO-friendly

**Examples**:
- ✅ `bracelet-model-a-weathered-silver`
- ✅ `chain-model-x-matte-black`
- ✅ `kiosk-logo-hoodie-black`
- ❌ `Bracelet Model A` (has spaces and capital letters)
- ❌ `bracelet_model_a` (uses underscores instead of hyphens)

---

## Troubleshooting

### Products Not Showing in API

**Problem**: Products don't appear in GraphQL queries  
**Solution**:
- Verify products are published (not draft)
- Check product visibility settings
- Ensure Storefront API has access to products

### Metafields Not Appearing

**Problem**: Metafields are not returned in API queries  
**Solution**:
- Verify metafields are set up correctly in Settings
- Check metafield namespace and key match the query
- Ensure metafields are added to products
- Verify Storefront API has access to metafields

### Product Handles Not Working

**Problem**: Frontend can't fetch product by handle  
**Solution**:
- Verify handle spelling matches exactly (case-sensitive)
- Check handle in Shopify Admin product page
- Test handle in GraphiQL explorer first
- Ensure product is published and visible

---

## Next Steps

After setting up products:

1. ✅ Verify Storefront API access (see `docs/SHOPIFY_STOREFRONT_API_SETUP.md`)
2. ✅ Test product queries in GraphiQL explorer
3. ✅ Update frontend to use real product handles
4. ✅ Test product display on carousel and store pages
5. ✅ Verify metafields display correctly in product drawer

---

**Last Updated**: January 2025  
**Related Documentation**: 
- `INSTRUCTIONS.md` - General project instructions
- `docs/SHOPIFY_STOREFRONT_API_SETUP.md` - API setup guide

