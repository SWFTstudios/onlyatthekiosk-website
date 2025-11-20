# Airtable "Products" Table Structure
## Matching Shopify Product Template CSV

### Table Name: **Products**

### Field Definitions (in order matching Shopify CSV):

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| **Handle** | Single line text | Unique product identifier/slug (e.g., "play-two-jade-green") |
| **Title** | Single line text | Product name (e.g., "PLAY TWO - Jade Green") |
| **Body (HTML)** | Long text | Product description in HTML format |
| **Vendor** | Single line text | Brand/vendor name (e.g., "Only at The Kiosk") |
| **Product Category** | Single line text | Full category path (e.g., "Apparel & Accessories > Clothing > T-Shirts") |
| **Type** | Single select | Product type (e.g., "Shirts", "Pants", "Accessories") |
| **Tags** | Multiple select | Comma-separated tags (e.g., "Limited Stock", "Featured") |
| **Published** | Checkbox | TRUE/FALSE - Whether product is published |
| **Option1 Name** | Single line text | First variant option name (e.g., "Color", "Size") |
| **Option1 Value** | Single line text | First variant option value (e.g., "Green", "S") |
| **Option2 Name** | Single line text | Second variant option name (e.g., "Size") |
| **Option2 Value** | Single line text | Second variant option value (e.g., "M") |
| **Option3 Name** | Single line text | Third variant option name (if needed) |
| **Option3 Value** | Single line text | Third variant option value (if needed) |
| **Variant SKU** | Single line text | Stock keeping unit (e.g., "SRT_COT_111") |
| **Variant Grams** | Number | Weight in grams |
| **Variant Inventory Tracker** | Single select | "shopify" or empty |
| **Variant Inventory Qty** | Number | Stock quantity |
| **Variant Inventory Policy** | Single select | "deny" or "continue" |
| **Variant Fulfillment Service** | Single select | "manual" or service name |
| **Variant Price** | Number | Product price (e.g., 2600) |
| **Variant Compare At Price** | Number | Original/compare price (for sales) |
| **Variant Requires Shipping** | Checkbox | TRUE/FALSE |
| **Variant Taxable** | Checkbox | TRUE/FALSE |
| **Variant Barcode** | Single line text | Product barcode/UPC |
| **Image Src** | Attachment | Primary product image |
| **Image Position** | Number | Image order/position (1, 2, 3...) |
| **Image Alt Text** | Single line text | Alt text for accessibility |
| **Gift Card** | Checkbox | TRUE/FALSE - Is it a gift card |
| **SEO Title** | Single line text | SEO meta title |
| **SEO Description** | Single line text | SEO meta description |
| **Google Shopping / Google Product Category** | Number | Google product category ID |
| **Google Shopping / Gender** | Single select | "male", "female", "unisex" |
| **Google Shopping / Age Group** | Single select | "adult", "kids", "infant" |
| **Google Shopping / MPN** | Single line text | Manufacturer part number |
| **Google Shopping / Condition** | Single select | "new", "used", "refurbished" |
| **Google Shopping / Custom Product** | Checkbox | TRUE/FALSE |
| **Variant Image** | Attachment | Variant-specific image |
| **Variant Weight Unit** | Single select | "g", "kg", "oz", "lb" |
| **Variant Tax Code** | Single line text | Tax code |
| **Cost per item** | Number | Cost price |
| **Included / United States** | Checkbox | Available in US |
| **Price / United States** | Number | US-specific price |
| **Compare At Price / United States** | Number | US compare price |
| **Included / International** | Checkbox | Available internationally |
| **Price / International** | Number | International price |
| **Compare At Price / International** | Number | International compare price |
| **Status** | Single select | "active", "draft", "archived" |

### Additional Recommended Fields (for store functionality):

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| **Featured** | Checkbox | Show in featured section on store page |
| **Category Display** | Single select | "Chains & Bracelets", "T-Shirts & Hoodies", etc. |
| **Secondary Image** | Attachment | Hover/secondary image for product display |
| **Image Srcset** | Long text | Responsive image srcset string |
| **Currency** | Single select | "SEK", "USD", "EUR" |
| **Product URL** | Single line text | Product page URL/slug |

### Field Type Specifications:

- **Single line text**: Text field (max ~255 chars)
- **Long text**: Text area (unlimited)
- **Number**: Number field (decimal allowed)
- **Checkbox**: Yes/No field
- **Single select**: Dropdown with options
- **Multiple select**: Multi-select dropdown
- **Attachment**: File/image attachment field

### Notes:

1. **Variant Handling**: In Shopify CSV, variants are separate rows with same Handle. In Airtable, you can either:
   - Create separate records for each variant (matching Shopify structure)
   - Use linked records to a "Variants" table
   - Use a single record with multiple select fields for options

2. **Images**: Use Airtable's Attachment field type to store images. You can attach multiple images per record.

3. **Currency**: Consider storing price as number and currency separately for flexibility.

4. **Status**: Use single select with options: "active", "draft", "archived" to match Shopify.

