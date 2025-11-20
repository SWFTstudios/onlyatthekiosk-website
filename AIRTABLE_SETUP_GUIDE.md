# Airtable Products Table Setup Guide

## Step-by-Step Instructions

### 1. Create New Table
- In your Airtable base, click "+ Add a table"
- Name it: **Products**

### 2. Add Fields (In This Exact Order)

#### Essential Product Fields (First 10):
1. **Handle** - Single line text
2. **Title** - Single line text  
3. **Body (HTML)** - Long text
4. **Vendor** - Single line text (default: "Only at The Kiosk")
5. **Product Category** - Single line text
6. **Type** - Single select (options: Shirts, Pants, Accessories, Chains, Bracelets, Hoodies)
7. **Tags** - Multiple select (options: Limited Stock, Featured, New, Sale)
8. **Published** - Checkbox
9. **Featured** - Checkbox (for store page display)
10. **Status** - Single select (options: active, draft, archived)

#### Variant/Option Fields:
11. **Option1 Name** - Single line text (e.g., "Color", "Size")
12. **Option1 Value** - Single line text
13. **Option2 Name** - Single line text
14. **Option2 Value** - Single line text
15. **Option3 Name** - Single line text
16. **Option3 Value** - Single line text

#### Inventory & Pricing:
17. **Variant SKU** - Single line text
18. **Variant Grams** - Number (decimal)
19. **Variant Inventory Tracker** - Single select (options: shopify, [empty])
20. **Variant Inventory Qty** - Number
21. **Variant Inventory Policy** - Single select (options: deny, continue)
22. **Variant Fulfillment Service** - Single select (options: manual, [other])
23. **Variant Price** - Number (decimal)
24. **Variant Compare At Price** - Number (decimal)
25. **Currency** - Single select (options: SEK, USD, EUR)
26. **Cost per item** - Number (decimal)

#### Shipping & Tax:
27. **Variant Requires Shipping** - Checkbox
28. **Variant Taxable** - Checkbox
29. **Variant Barcode** - Single line text
30. **Variant Weight Unit** - Single select (options: g, kg, oz, lb)
31. **Variant Tax Code** - Single line text

#### Images (Critical for Store Display):
32. **Image Src** - Attachment (Primary product image)
33. **Image Position** - Number (1, 2, 3...)
34. **Image Alt Text** - Single line text
35. **Secondary Image** - Attachment (Hover/secondary image)
36. **Variant Image** - Attachment (Variant-specific image)
37. **Image Srcset** - Long text (Responsive image srcset string)

#### SEO Fields:
38. **SEO Title** - Single line text
39. **SEO Description** - Long text
40. **Gift Card** - Checkbox

#### Google Shopping Fields:
41. **Google Shopping / Google Product Category** - Number
42. **Google Shopping / Gender** - Single select (options: male, female, unisex)
43. **Google Shopping / Age Group** - Single select (options: adult, kids, infant)
44. **Google Shopping / MPN** - Single line text
45. **Google Shopping / Condition** - Single select (options: new, used, refurbished)
46. **Google Shopping / Custom Product** - Checkbox

#### Regional Pricing:
47. **Included / United States** - Checkbox
48. **Price / United States** - Number
49. **Compare At Price / United States** - Number
50. **Included / International** - Checkbox
51. **Price / International** - Number
52. **Compare At Price / International** - Number

#### Store-Specific Fields:
53. **Category Display** - Single select (options: Chains & Bracelets, T-Shirts & Hoodies, Accessories)
54. **Product URL** - Single line text (Product page slug/URL)

### 3. Field Configuration Tips

#### For Single Select Fields:
- Click the field → Configure options
- Add all possible values
- Set a default if needed

#### For Attachment Fields (Images):
- Field type: Attachment
- Can attach multiple files
- Recommended: Upload images directly to Airtable for best performance

#### For Number Fields:
- Set format to "Decimal" for prices
- Set format to "Integer" for quantities

### 4. Example Record Structure

**Product Record:**
- Handle: `play-two-jade-green`
- Title: `PLAY TWO - Jade Green (Limited Stock)`
- Body (HTML): `<p>Description here</p>`
- Vendor: `Only at The Kiosk`
- Product Category: `Apparel & Accessories > Accessories > Jewelry`
- Type: `Chains`
- Tags: `Limited Stock, Featured`
- Published: ✓ (checked)
- Featured: ✓ (checked)
- Status: `active`
- Variant Price: `2600`
- Currency: `SEK`
- Image Src: [Upload primary image]
- Secondary Image: [Upload hover image]
- Category Display: `Chains & Bracelets`

### 5. Variant Handling Options

**Option A: Separate Records (Shopify-style)**
- Create one record per variant
- Use same Handle for all variants of same product
- Fill in Option1/Option2 values per variant

**Option B: Single Record with Options**
- One record per product
- Use multiple select for Option1 Value, Option2 Value
- Create variants programmatically when needed

**Recommendation:** Use Option A to match Shopify structure exactly.

### 6. Quick Reference: Field Order

```
1-10: Core Product Info
11-16: Variant Options
17-26: Inventory & Pricing
27-31: Shipping & Tax
32-37: Images
38-40: SEO
41-46: Google Shopping
47-52: Regional Pricing
53-54: Store-Specific
```

### 7. Testing Your Setup

1. Create a test product record
2. Fill in all essential fields
3. Upload test images
4. Verify data exports correctly
5. Test API access if using Airtable API

