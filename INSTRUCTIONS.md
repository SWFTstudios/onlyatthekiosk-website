# Development Instructions - Only at The Kiosk

## Project Philosophy

**Custom Frontend + Shopify Backend**

This project creates a completely custom frontend and user experience while leveraging Shopify as the backend for all e-commerce functionality. The frontend is custom-built with HTML, CSS, and JavaScript to provide a unique, branded experience that stands out from standard Shopify themes.

### Core Principles

1. **Frontend is Custom**: All UI, animations, interactions, and layouts are custom-built
2. **Backend is Shopify**: Products, inventory, cart, checkout, payments, and orders are handled by Shopify
3. **Design is Minimalistic**: Black, white, and various greys. Simple, clean, purposeful
4. **Mobile-First**: All experiences must work beautifully on mobile devices
5. **Performance is Critical**: Fast loading, optimized images, efficient code

---

## Architecture Overview

### Frontend (Custom)
- **HTML/CSS/JavaScript**: Vanilla JS preferred, minimal dependencies
- **Hosting**: Cloudflare Pages (static site)
- **Styling**: Custom CSS (minimal, black/white/grey theme)
- **Fonts**: GeneralSans and SuisseIntl (already configured)

### Backend (Shopify)
- **Products**: Managed in Shopify Admin
- **Storefront API**: Used to fetch products, variants, images
- **Cart API**: Add to cart, update quantities
- **Checkout**: Shopify checkout (can be customized)
- **Payments**: Shopify Payments
- **Inventory**: Shopify inventory management

### Additional Services
- **Airtable**: Email signups (via Cloudflare Pages Functions)
- **Supabase**: CRM and customer data (configured, not actively used yet)
- **Cloudflare Pages Functions**: Serverless functions for API endpoints

---

## Technology Stack

### Frontend Libraries
- **Swiper.js** (v10): Carousel/slider functionality
- **GSAP** (v3.12.2): Animations and transitions
- **jQuery** (v3.5.1): DOM manipulation (consider migrating to vanilla JS)

### APIs
- **Shopify Storefront API**: GraphQL endpoint for products, cart operations
- **Airtable API**: Email signup storage
- **Supabase**: Customer data and CRM (future)

### Hosting & Infrastructure
- **Cloudflare Pages**: Static site hosting
- **Cloudflare CDN**: Global content delivery
- **Cloudflare Pages Functions**: Serverless API endpoints

---

## Component Architecture

### Reusable Components

**Important**: Components are shared across all pages. When you modify a component on one page, the change should automatically apply to all pages that use it.

#### Components List:
- **Navigation Bar**: The fullscreen navigation overlay (`navbar`) is a shared component. Changes made to `css/navigation.css` or the navigation HTML structure in one file should be reflected across all pages (index.html, store.html, carousel-template.html, kiosk-styleguide.html).

**Component Implementation Guidelines**:
1. **CSS Components**: Store component styles in `css/navigation.css` or `css/components.css`
2. **HTML Components**: Use the same HTML structure across all pages for shared components
3. **JavaScript Components**: Component logic should be in shared files (e.g., `js/navigation.js`)
4. **Single Source of Truth**: When making changes to components, update the shared CSS/JS files, not individual page styles

**Example**: If you change the navigation menu on index.html, make the same change to all other pages that include the navigation. Better yet, create a shared navigation snippet that can be included across pages.

---

## File Organization

### Core Files
```
/
├── index.html              # Landing/coming soon page
├── store.html              # Store page (if different from carousel)
├── carousel-template.html  # 3D carousel product showcase
├── css/
│   ├── normalize.css      # CSS reset
│   ├── components.css     # Reusable components
│   └── onlyatthekiosk.css # Main styles
├── js/
│   ├── email-signup.js    # Email form handling
│   └── onlyatthekiosk.js  # Main site scripts
└── functions/
    └── api/
        └── subscribe.js   # Email signup API endpoint
```

### Supporting Files
```
/
├── images/                 # Image assets
├── fonts/                  # Font files (GeneralSans, SuisseIntl)
├── docs/                   # Documentation
└── webflow-exports/        # Reference designs from Webflow
```

### Complete Project Structure

```
.
├── 401.html
├── build.sh
├── carousel-template.html
├── css
│   ├── components.css
│   ├── media.css
│   ├── navigation.css
│   ├── normalize.css
│   ├── onlyatthekiosk.css
│   └── webflow.css
├── docs
│   ├── 3D_CAROUSEL_ANALYSIS.md
│   ├── architecture
│   │   └── ARCHITECTURE_CLARIFICATION.md
│   ├── ARCHITECTURE.md
│   ├── archive
│   │   ├── AIRTABLE_ADD_FIELDS_GUIDE.md
│   │   ├── AIRTABLE_FIELD_MAPPING_GUIDE.md
│   │   ├── AIRTABLE_FIELD_MAPPING.md
│   │   ├── AIRTABLE_PRODUCTS_TABLE_STRUCTURE.md
│   │   ├── AIRTABLE_SETUP_GUIDE.md
│   │   ├── AIRTABLE_TO_SUPABASE_SYNC.md
│   │   ├── AUTOMATIC_SYNC_SETUP.md
│   │   ├── COMMIT_MESSAGE.md
│   │   ├── COMPLETE_SYNC_SETUP.md
│   │   ├── CORRECT_FUNCTION_URL.md
│   │   ├── CREATE_INDEXES_AND_VIEW.sql
│   │   ├── CREATE_PRODUCTS_TABLE_FIXED.sql
│   │   ├── DEPLOY_NOW.md
│   │   ├── DEPLOY_SYNC_FUNCTION.md
│   │   ├── FIX_SYNC_ERROR.md
│   │   ├── FIX_VIEW_ERROR.sql
│   │   ├── FUNCTION_DEPLOYED.md
│   │   ├── MULTI_SOURCE_SYNC.md
│   │   ├── PRODUCT_BLOCK_MAPPING.md
│   │   ├── README.md
│   │   ├── SETUP_CHECKLIST.md
│   │   ├── setup_scheduled_sync.sql
│   │   ├── SHOPIFY_SUPABASE_SYNC.md
│   │   ├── SHOPIFY_SYNC_SETUP.md
│   │   ├── SYNC_SETUP_SUMMARY.md
│   │   ├── SYNC_SUCCESS.md
│   │   ├── UPDATE_FOREIGN_TABLE.sql
│   │   ├── UPDATE_SYNC_FOR_NEW_TABLE.md
│   │   ├── VERIFY_AIRTABLE_FIELDS.sql
│   │   └── VERIFY_FUNCTION.md
│   ├── CLEANUP_SUMMARY.md
│   ├── CONTAINER_BORDERS_CHEATSHEET.md
│   ├── EMAIL_SIGNUP.md
│   ├── IMAGE_SOURCES.md
│   ├── scripts
│   ├── SETUP.md
│   ├── supabase
│   │   ├── SUPABASE_AIRTABLE_SETUP.md
│   │   ├── SUPABASE_GITHUB_SETUP.md
│   │   ├── SUPABASE_QUICK_START.md
│   │   └── SUPABASE_SETUP_SQL.sql
│   ├── SUPABASE_SETUP.md
│   └── TROUBLESHOOTING_EMAIL_SIGNUP.md
├── documents
│   └── Excon_Complete.zip
├── fonts
│   ├── Excon_Complete.zip
│   ├── GeneralSans-Bold.ttf
│   ├── GeneralSans-BoldItalic.ttf
│   ├── GeneralSans-Extralight.ttf
│   ├── GeneralSans-ExtralightItalic.ttf
│   ├── GeneralSans-Italic.ttf
│   ├── GeneralSans-Light.ttf
│   ├── GeneralSans-LightItalic.ttf
│   ├── GeneralSans-Medium.ttf
│   ├── GeneralSans-MediumItalic.ttf
│   ├── GeneralSans-Regular.ttf
│   ├── GeneralSans-Semibold.ttf
│   ├── GeneralSans-SemiboldItalic.ttf
│   ├── GeneralSans-Variable.ttf
│   ├── GeneralSans-VariableItalic.ttf
│   ├── SuisseIntl-Medium-WebS.woff2
│   └── SuisseIntl-Regular-WebS.woff2
├── functions
│   └── api
│       └── subscribe.js
├── images
│   └── [Image assets - see docs/IMAGE_SOURCES.md]
├── index.html
├── INSTRUCTIONS.md
├── js
│   ├── email-signup.js
│   ├── lenis.js
│   ├── media.js
│   ├── navigation.js
│   ├── onlyatthekiosk.js
│   └── webflow.js
├── kiosk-styleguide.html
├── media.html
├── PROJECT_STRUCTURE.md
├── README.md
├── scripts
│   ├── archive
│   ├── find_products_table.js
│   ├── read_airtable_products.js
│   └── test_sync.sh
├── store.html
├── supabase
│   ├── functions
│   │   └── archive
│   └── migrations
│       ├── 20250101000000_create_products_table.sql
│       └── archive
├── videos
│   ├── index.html
│   ├── ledefile-final-poster-00001.jpg
│   ├── ledefile-final-transcode.mp4
│   ├── ledefile-final-transcode.webm
│   ├── ledefile-final.mp4
│   ├── media.html
│   ├── purple_galaxy-poster-00001.jpg
│   ├── purple_galaxy-transcode.mp4
│   ├── purple_galaxy-transcode.webm
│   ├── purple_galaxy.mp4
│   ├── shop.html
│   └── stories.html
└── webflow-exports
    ├── 8xflow-styleguide-starter
    │   ├── 8xflow-figma-to-webflow-styleguide.html
    │   ├── css
    │   ├── images
    │   ├── index.html
    │   ├── js
    │   └── sample-page.html
    ├── free-e-commerce-cloneable
    │   ├── 401.html
    │   ├── 404.html
    │   ├── checkout.html
    │   ├── css
    │   ├── delivery-and-returns.html
    │   ├── detail_category.html
    │   ├── detail_product.html
    │   ├── detail_sku.html
    │   ├── fonts
    │   ├── images
    │   ├── index.html
    │   ├── js
    │   ├── order-confirmation.html
    │   ├── paypal-checkout.html
    │   ├── privacy-policy.html
    │   ├── style-guide.html
    │   └── terms-and-conditions.html
    ├── full-screen-overlay-navigation-v3
    │   ├── 401.html
    │   ├── 404.html
    │   ├── css
    │   ├── fonts
    │   ├── images
    │   ├── index.html
    │   └── js
    └── wanderlostgalaxy-media-template
        ├── css
        ├── images
        ├── js
        └── videos
```

**Note**: The `images/` directory contains many image assets (product images, promotional images, icons, etc.). See `docs/IMAGE_SOURCES.md` for details on image sources and organization.

---

## Design Guidelines

### Color Palette
- **Primary Background**: `#000000` (black)
- **Primary Text**: `#ffffff` (white)
- **Secondary Text**: `#888888`, `#aaaaaa`, `#cccccc` (various greys)
- **Accent Color**: TBD (to be determined later)

### Typography
- **Primary Font**: GeneralSans (variable font available)
- **Secondary Font**: SuisseIntl (for headings, special text)
- **Font Weights**: Use variable fonts, adjust weight as needed
- **Font Sizing**: Responsive, use `rem` or `em` units

### Spacing & Layout
- **Minimal Padding**: Generous whitespace, but purposeful
- **Centered Content**: Use flexbox/grid for centering
- **Responsive Breakpoints**: Mobile-first approach
  - Mobile: `< 768px`
  - Tablet: `768px - 1024px`
  - Desktop: `> 1024px`

### Animations
- **Purposeful**: Animations should enhance UX, not distract
- **Smooth**: Use GSAP or CSS transitions (60fps target)
- **Performance**: Use `transform` and `opacity` for animations (GPU-accelerated)

---

## Shopify Integration

**📚 Comprehensive Reference**: See [`docs/SHOPIFY_STOREFRONT_API_REFERENCE.md`](docs/SHOPIFY_STOREFRONT_API_REFERENCE.md) for complete API documentation, best practices, troubleshooting, and official Shopify links.

### Storefront API Configuration

**Store Domain**: `onlyatthekiosk.com`  
**API Endpoint**: `https://onlyatthekiosk.com/api/2024-01/graphql.json`  
**Access Token**: Stored in environment variables (not hardcoded)

**Official Documentation**: [Shopify Storefront API](https://shopify.dev/docs/api/storefront/latest)

### Using Storefront API

1. **Fetch Products**:
   ```javascript
   const SHOPIFY_STORE = 'onlyatthekiosk.com';
   const SHOPIFY_TOKEN = env.SHOPIFY_STOREFRONT_TOKEN; // From env vars
   const SHOPIFY_API_URL = `https://${SHOPIFY_STORE}/api/2024-01/graphql.json`;
   
   // GraphQL query to fetch products
   const query = `
     query getProducts($first: Int!) {
       products(first: $first) {
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
           }
         }
       }
     }
   `;
   ```

2. **Add to Cart**:
   - Use Shopify Cart API or Storefront API
   - Redirect to Shopify checkout or embed checkout

3. **Product Handles**:
   - Use product handles as identifiers (e.g., `product-handle-1`)
   - Handles are SEO-friendly and human-readable

### Environment Variables

**Never hardcode API tokens or secrets in code!**

Store these in Cloudflare Pages environment variables:

#### Required Variables

- **`AIRTABLE_ACCESS_TOKEN`**: Airtable Personal Access Token
  - Get from: Airtable Account → Developer hub → Personal access tokens
  - Required scopes: `data.records:read`, `data.records:write`
  - Used for: Products and Orders API access

- **`AIRTABLE_BASE_ID`**: Airtable Base ID
  - Get from: Airtable base URL: `https://airtable.com/app{BaseID}/...`
  - Used for: Products and Orders tables

- **`SHOPIFY_WEBHOOK_SECRET`**: Shopify webhook secret (for order tracking)
  - Get from: Shopify Admin → Settings → Notifications → Webhooks → Your webhook
  - Used for: Verifying webhook authenticity

#### Optional Variables (with defaults)

- **`AIRTABLE_PRODUCTS_TABLE`**: Airtable Products table name (default: `Products`)
- **`AIRTABLE_ORDERS_TABLE`**: Airtable Orders table name (default: `Orders`)
- **`SHOPIFY_STORE_DOMAIN`**: Shopify store domain (default: `onlyatthekiosk.com`)

#### Deprecated Variables

- **`SHOPIFY_STOREFRONT_TOKEN`**: No longer needed (products now from Airtable)
- **`SHOPIFY_API_VERSION`**: No longer needed (products now from Airtable)

**For Airtable setup, see**: [`docs/AIRTABLE_PRODUCTS_SETUP.md`](docs/AIRTABLE_PRODUCTS_SETUP.md)  
**For Shopify Buy Button setup, see**: [`docs/SHOPIFY_BUY_BUTTON_SETUP.md`](docs/SHOPIFY_BUY_BUTTON_SETUP.md)  
**For Shopify webhook setup, see**: [`docs/SHOPIFY_WEBHOOK_SETUP.md`](docs/SHOPIFY_WEBHOOK_SETUP.md)

#### Setting Environment Variables in Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Pages** → Select your project
2. Go to **Settings** → **Environment Variables**
3. Click **"Add variable"**
4. Enter variable name and value
5. Select environments (Production, Preview, Development)
6. Click **"Save"**

#### Local Development

For local development with `wrangler pages dev`, create a `.dev.vars` file in your project root:

```bash
# .dev.vars (DO NOT COMMIT THIS FILE - add to .gitignore)
AIRTABLE_ACCESS_TOKEN=your_airtable_token_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
AIRTABLE_PRODUCTS_TABLE=Products
AIRTABLE_ORDERS_TABLE=Orders
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
SHOPIFY_STORE_DOMAIN=onlyatthekiosk.com
```

**Important**: 
- Add `.dev.vars` to `.gitignore` to prevent committing secrets
- Never commit API tokens to version control

---

## Development Guidelines

### Code Style

1. **JavaScript**:
   - Use modern ES6+ syntax
   - Prefer `const` and `let` over `var`
   - Use arrow functions where appropriate
   - Add comments for complex logic
   - Handle errors gracefully

2. **CSS**:
   - Use semantic class names (BEM-like approach)
   - Keep selectors specific but not overly nested
   - Use CSS custom properties (variables) for theming
   - Mobile-first media queries
   - Use flexbox/grid for layouts

3. **HTML**:
   - Semantic HTML5 elements
   - Accessible markup (ARIA labels where needed)
   - SEO-friendly structure

### Performance Best Practices

1. **Images**:
   - Optimize images before uploading
   - Use appropriate formats (WebP, AVIF when possible)
   - Lazy load images below the fold
   - Use Shopify CDN URLs for product images

2. **JavaScript**:
   - Minimize dependencies
   - Load scripts asynchronously when possible
   - Use event delegation for dynamic content
   - Debounce/throttle scroll and resize handlers

3. **CSS**:
   - Minimize CSS (remove unused styles)
   - Use CSS containment for performance
   - Avoid expensive selectors

### Mobile Development

1. **Touch Interactions**:
   - Ensure touch targets are at least 44x44px
   - Support swipe gestures where appropriate
   - Test on real devices, not just emulators

2. **Viewport**:
   - Use `width=device-width, initial-scale=1`
   - Consider `viewport-fit=cover` for notched devices
   - Test with `100svh` for mobile browsers

3. **Performance**:
   - Minimize JavaScript execution time
   - Optimize for slow 3G connections
   - Test on lower-end devices

---

## Common Tasks

### Adding a New Page

1. Create HTML file in root directory
2. Link CSS files in `<head>`:
   ```html
   <link href="css/normalize.css" rel="stylesheet">
   <link href="css/components.css" rel="stylesheet">
   <link href="css/onlyatthekiosk.css" rel="stylesheet">
   ```
3. Link JavaScript files before `</body>`:
   ```html
   <script src="js/onlyatthekiosk.js"></script>
   ```
4. Follow existing design patterns and structure

### Adding Shopify Products

1. Add products in Shopify Admin
2. Note the product handle
3. Use product handle in frontend code:
   ```html
   <div data-product-handle="your-product-handle">
   ```
4. Fetch product data using Shopify Storefront API

### Integrating Email Signup

1. Use existing form structure from `index.html`
2. Form submits to `/api/subscribe` endpoint
3. Cloudflare Pages Function handles storage in Airtable
4. See `functions/api/subscribe.js` for API implementation

---

## Testing Checklist

Before deploying, test:

- [ ] All pages load correctly
- [ ] Shopify API calls work (products load)
- [ ] Email signup form works
- [ ] Responsive design on mobile (< 768px)
- [ ] Responsive design on tablet (768px - 1024px)
- [ ] Responsive design on desktop (> 1024px)
- [ ] Touch gestures work on mobile
- [ ] Animations are smooth (60fps)
- [ ] Images load and are optimized
- [ ] No console errors
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] SEO (meta tags, structured data)

---

## Deployment

### Cloudflare Pages

1. **Automatic Deployment**:
   - Push to `main` branch triggers automatic deployment
   - Cloudflare Pages builds and deploys automatically

2. **Manual Deployment**:
   - Use Cloudflare Pages dashboard
   - Trigger deployment from GitHub

3. **Environment Variables**:
   - Set in Cloudflare Pages dashboard
   - Settings → Environment Variables
   - Add production and preview values

### Git Workflow

1. **Branch Naming**:
   - `main`: Production branch
   - `feature/description`: Feature branches
   - `fix/description`: Bug fix branches

2. **Commits**:
   - Write clear, descriptive commit messages
   - Reference issues/tickets if applicable

3. **Pull Requests**:
   - Review before merging to `main`
   - Test changes before merging

---

## Troubleshooting

### Shopify API Issues

**Problem**: API calls failing  
**Solution**: 
- Check API token is set in environment variables
- Verify store domain is correct
- Check GraphQL query syntax
- Review network tab in browser dev tools

### Image Loading Issues

**Problem**: Images not displaying  
**Solution**:
- Check image paths (use absolute paths `/images/...`)
- Verify file exists in `images/` directory
- Check file size (optimize if too large)
- Use Shopify CDN URLs for product images

### Mobile Touch Issues

**Problem**: Touch gestures not working  
**Solution**:
- Ensure `touch-action` CSS property is set correctly
- Check event listeners are attached
- Test on real device, not just emulator
- Verify Swiper.js configuration for touch

---

## Resources

### Documentation
- `docs/ARCHITECTURE.md`: System architecture overview
- `docs/SETUP.md`: Setup instructions
- `README.md`: Project README

### External Documentation
- [Shopify Storefront API](https://shopify.dev/api/storefront)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GSAP Documentation](https://greensock.com/docs/)
- [Swiper.js Documentation](https://swiperjs.com/)

---

## Questions or Issues?

1. Check existing documentation in `docs/`
2. Review code comments in relevant files
3. Test in isolation (create a test page)
4. Check browser console for errors
5. Review network tab for API issues

---

**Last Updated**: January 2025  
**Maintained By**: SWFT Studios

