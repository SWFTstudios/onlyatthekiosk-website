# How to Add Shopify Product Fields to Your Airtable Table

## Current Situation

Your Products table currently has these fields:
- Name
- Notes
- Assignee
- Status
- Attachments
- Attachment Summary

These are default/template fields. You need to add the Shopify product fields.

## Step-by-Step: Add Fields to Airtable

### Option 1: Add Fields One by One (Recommended)

1. Open your Airtable base: https://airtable.com/appA3qQw0NAqz8ru3/tblH1dZDvuUWfKuWb
2. Click the **"+"** button at the top right to add a new field
3. Add these fields in order:

#### Essential Fields (Add These First):

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| **Handle** | Single line text | Unique product identifier (e.g., "play-two-jade-green") |
| **Title** | Single line text | Product name (or rename "Name" to "Title") |
| **Body (HTML)** | Long text | Product description (or use "Notes" if you prefer) |
| **Vendor** | Single line text | Brand name (e.g., "Only at The Kiosk") |
| **Product Category** | Single line text | Full category path |
| **Type** | Single select | Options: Shirts, Pants, Accessories, Chains, Bracelets, Hoodies |
| **Tags** | Multiple select | Options: Limited Stock, Featured, New, Sale |
| **Published** | Checkbox | TRUE/FALSE |
| **Featured** | Checkbox | TRUE/FALSE |
| **Variant Price** | Number | Product price (decimal allowed) |
| **Currency** | Single select | Options: SEK, USD, EUR |
| **Image Src** | Attachment | Primary product image |
| **Secondary Image** | Attachment | Hover/secondary image |
| **Category Display** | Single select | Options: Chains & Bracelets, T-Shirts & Hoodies, Accessories |
| **Status** | Single select | Options: active, draft, archived (or use existing "Status" field) |

### Option 2: Import from Template

1. Create a new table called "Products Template" 
2. Add all fields from `AIRTABLE_PRODUCTS_TABLE_STRUCTURE.md`
3. Copy the structure to your Products table
4. Delete the template table

## After Adding Fields

Once you've added the Shopify fields:

1. **Update the Foreign Table in Supabase**:
   - Run the updated `CREATE FOREIGN TABLE` statement
   - Include all your new fields

2. **Add Your First Product**:
   - Fill in at least: Handle, Title, Variant Price, Currency, Published, Status
   - Upload product images
   - Mark as Featured if you want it on the store page

3. **Test the Connection**:
   ```sql
   SELECT * FROM airtable.products;
   SELECT * FROM public.store_products WHERE featured = true;
   ```

## Quick Field Addition Checklist

- [ ] Handle (Single line text)
- [ ] Title (or rename Name)
- [ ] Body (HTML) (or use Notes)
- [ ] Vendor (Single line text)
- [ ] Variant Price (Number)
- [ ] Currency (Single select)
- [ ] Image Src (Attachment)
- [ ] Secondary Image (Attachment)
- [ ] Featured (Checkbox)
- [ ] Published (Checkbox)
- [ ] Category Display (Single select)
- [ ] Status (Single select) - or use existing

## Field Name Matching

**Important**: The field names in your Supabase foreign table MUST match exactly what you name them in Airtable (case-sensitive, spaces included).

For example:
- If Airtable field is `"Variant Price"` → SQL uses `"Variant Price"`
- If Airtable field is `VariantPrice` → SQL uses `VariantPrice`
- If Airtable field is `variant_price` → SQL uses `variant_price`

