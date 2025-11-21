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

### Storefront API Configuration

**Store Domain**: `onlyatthekiosk.com`  
**API Endpoint**: `https://onlyatthekiosk.com/api/2024-01/graphql.json`  
**Access Token**: Stored in environment variables (not hardcoded)

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
- `SHOPIFY_STOREFRONT_TOKEN`: Shopify Storefront API access token
- `AIRTABLE_ACCESS_TOKEN`: Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Airtable Base ID

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

