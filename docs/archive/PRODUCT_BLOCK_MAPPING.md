# Featured Product Block Element Mapping

## HTML Structure Analysis (from store.html lines 170-176)

### Core Elements Required:

1. **Product Link/URL**
   - Field: `href` attribute on `<a>` tag
   - Currently: `#` (placeholder)
   - Needed: Product page URL or slug

2. **Product Title/Name**
   - Field: `.featured-product_name` text content
   - Example: "PLAY TWO - Jade Green (Limited Stock)"
   - Needed: Product title/name

3. **Product Price**
   - Field: `<p>` text content in `.featured-product_bottom`
   - Example: "2 600 SEK"
   - Needed: Price with currency

4. **Primary Product Image**
   - Field: `.featured_products-image` `src` attribute
   - Example: `images/twotwo-playtwo-jadegreen-product-image-5_900x-1.jpg`
   - Needed: Main product image URL/path

5. **Secondary Product Image (Hover)**
   - Field: `.featured_products-image-secondary` `src` attribute
   - Example: `images/twotwo-racket-green-product-image-ls-01_900x-1.jpg`
   - Needed: Secondary/hover image URL/path

6. **Responsive Image Srcset**
   - Field: `srcset` attribute for responsive images
   - Example: `images/twotwo-racket-green-product-image-ls-01_900x-1-p-500.jpeg 500w, images/twotwo-racket-green-product-image-ls-01_900x-1.jpg 900w`
   - Needed: Multiple image sizes for responsive display

7. **Image Alt Text**
   - Field: `alt` attribute on images
   - Needed: Descriptive alt text for accessibility

8. **Product Category**
   - Field: Used for grouping products in sections
   - Example: "Featured Chains & Bracelets", "Featured T-Shirts & Hoodies"
   - Needed: Category name for organization

9. **Buy Spinner (Decorative)**
   - Field: `.buy-spinner` SVG elements
   - Currently: Static `images/buy-spinner.svg`
   - Needed: Can be static or dynamic per product

### Data Fields Mapping to Shopify Template:

| HTML Element | Shopify CSV Field | Airtable Field |
|-------------|-------------------|----------------|
| Product Name | `Title` | `Title` |
| Product Price | `Variant Price` | `Price` |
| Primary Image | `Image Src` | `Primary Image` |
| Secondary Image | `Variant Image` | `Secondary Image` |
| Product Description | `Body (HTML)` | `Description` |
| Product Category | `Product Category` | `Category` |
| Product Type | `Type` | `Type` |
| Tags | `Tags` | `Tags` |
| Handle/Slug | `Handle` | `Handle` |
| SEO Title | `SEO Title` | `SEO Title` |
| SEO Description | `SEO Description` | `SEO Description` |

### Additional Fields Needed for Store Display:

- `Featured` (Checkbox) - Whether to show in featured section
- `Image Position` (Number) - For image ordering
- `Status` (Select) - active/draft/archived
- `Currency` (Text) - SEK, USD, etc.
- `Compare At Price` (Number) - For sale prices
- `Inventory Qty` (Number) - Stock quantity
- `Variant Options` (Multiple) - Size, Color, etc.

