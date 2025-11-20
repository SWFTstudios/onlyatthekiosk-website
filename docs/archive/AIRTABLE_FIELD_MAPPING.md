# Airtable → Supabase Field Mapping

## Products Table
- **Table ID**: `tbljwWvetx3bScjJ2`
- **URL**: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
- **Total Fields**: 48

## Field Mapping

| Airtable Field | Airtable Type | Supabase Field | Notes |
|---------------|---------------|----------------|-------|
| Handle | multilineText | handle | ✅ Mapped |
| Title | multilineText | title | ✅ Mapped |
| Body (HTML) | multilineText | body_html | ✅ Mapped |
| Vendor | singleSelect | vendor | ✅ Mapped |
| Product Category | multilineText | product_category | ✅ Mapped |
| Type | multilineText | type | ✅ Mapped |
| Tags | multipleSelects | tags | ✅ Mapped (array) |
| Published | singleSelect | published | ⚠️ Type mismatch (should be checkbox) - parsed as Yes/No |
| Status | multilineText | status | ✅ Mapped |
| Variant SKU | multilineText | variant_sku | ✅ Mapped |
| Variant Price | number | variant_price | ✅ Mapped |
| Variant Compare At Price | number | variant_compare_at_price | ✅ Mapped |
| Variant Requires Shipping | singleSelect | variant_requires_shipping | ⚠️ Type mismatch - parsed as Yes/No |
| Variant Taxable | singleSelect | variant_taxable | ⚠️ Type mismatch - parsed as Yes/No |
| Image Src | dateTime | primary_image | ⚠️ **WRONG TYPE** - Should be Attachment. Sync function handles this. |
| Variant Image | dateTime | secondary_image | ⚠️ **WRONG TYPE** - Should be Attachment. Sync function handles this. |
| Image Alt Text | multilineText | image_alt_text | ✅ Mapped |
| SEO Title | multilineText | seo_title | ✅ Mapped |
| SEO Description | multilineText | seo_description | ✅ Mapped |

## Missing Fields (Need to be Added to Airtable)

These fields are needed for the sync but don't exist in your Airtable table yet:

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Featured** | Checkbox | Show in featured section on store page |
| **Currency** | Single select | SEK, USD, EUR (default: SEK) |
| **Category Display** | Single select | Chains & Bracelets, T-Shirts & Hoodies, etc. |

## Field Type Issues to Fix in Airtable

### High Priority:

1. **Image Src** (currently `dateTime`) → Should be **Attachment**
   - This field is meant to store product images
   - Currently incorrectly typed as dateTime
   - Fix: Change field type to Attachment in Airtable

2. **Variant Image** (currently `dateTime`) → Should be **Attachment**
   - This field is meant to store secondary/hover images
   - Currently incorrectly typed as dateTime
   - Fix: Change field type to Attachment in Airtable

3. **Published** (currently `singleSelect`) → Should be **Checkbox**
   - Currently using singleSelect with Yes/No options
   - Better to use Checkbox for true/false
   - Sync function handles both, but checkbox is cleaner

### Optional:

4. **Variant Requires Shipping** (singleSelect) → Could be **Checkbox**
5. **Variant Taxable** (singleSelect) → Could be **Checkbox**

## How to Fix Field Types in Airtable

1. Open your Products table: https://airtable.com/appA3qQw0NAqz8ru3/tbljwWvetx3bScjJ2
2. Click on the field name header
3. Select "Customize field type"
4. Choose the correct field type:
   - **Image Src** → Change to "Attachment"
   - **Variant Image** → Change to "Attachment"
   - **Published** → Change to "Checkbox" (or keep as singleSelect - sync handles both)

## Recommended: Add Missing Fields

Add these fields to your Airtable table:

1. **Featured** (Checkbox)
   - Purpose: Mark products to show in featured section
   - Default: Unchecked

2. **Currency** (Single select)
   - Options: SEK, USD, EUR
   - Default: SEK

3. **Category Display** (Single select)
   - Options: Chains & Bracelets, T-Shirts & Hoodies, Accessories
   - Purpose: For grouping products on store page

## Sync Function Status

✅ The sync function is configured to:
- Handle field type mismatches (dateTime → image URLs, singleSelect → boolean)
- Map all 48 Airtable fields
- Extract image URLs from various field types
- Parse Published/Status fields correctly
- Work with current field structure

⚠️ **Note**: The sync function will work with the current setup, but fixing the field types (especially Image Src and Variant Image) is recommended for proper image handling.

## Next Steps

1. ✅ Sync function updated with correct table ID
2. ⚠️ Fix Image Src field type to Attachment
3. ⚠️ Fix Variant Image field type to Attachment
4. ➕ Add Featured field (Checkbox)
5. ➕ Add Currency field (Single select)
6. ➕ Add Category Display field (Single select)
7. ✅ Test sync function
8. ✅ Set up automatic sync

