# Project Structure

## Clean Project Organization

```
onlyatthekiosk-website/
├── index.html                      # Landing/Coming Soon page
├── store.html                      # Store page
├── 401.html                        # 401 error page
├── build.sh                        # Build script (no-op for Cloudflare Pages)
├── README.md                       # Main project README
│
├── css/                            # Stylesheets
│   ├── normalize.css
│   ├── components.css
│   └── onlyatthekiosk.css
│
├── js/                             # JavaScript
│   ├── email-signup.js            # Email signup form handler
│   └── onlyatthekiosk.js          # Main site scripts
│
├── functions/                      # Cloudflare Pages Functions
│   └── api/
│       └── subscribe.js           # Email signup API endpoint
│
├── images/                         # Images and assets
├── fonts/                          # Font files
├── videos/                         # Video assets
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md            # System architecture overview
│   ├── SETUP.md                   # Setup instructions
│   ├── SUPABASE_SETUP.md          # Supabase setup guide
│   ├── archive/                   # Archived documentation
│   │   ├── README.md             # Archive explanation
│   │   └── [archived files]      # Product sync docs (not in use)
│   ├── architecture/              # Architecture documentation
│   ├── supabase/                  # Supabase-specific docs
│   └── scripts/                   # Script documentation
│
├── scripts/                        # Utility scripts
│   ├── read_airtable_products.js  # Airtable table reader
│   ├── find_products_table.js     # Find Airtable tables
│   └── test_sync.sh               # Test sync script
│   └── archive/                   # Archived scripts
│
├── supabase/                       # Supabase configuration
│   ├── migrations/                # Database migrations
│   │   ├── 20250101000000_create_products_table.sql
│   │   └── archive/               # Archived migrations
│   └── functions/                 # Edge Functions
│       └── archive/               # Archived functions
│           ├── sync-airtable-products/
│           └── sync-shopify-product/
│
```

## Active Files (In Use)

### Website
- `index.html` - Main landing page
- `store.html` - Store page
- `css/` - All stylesheets
- `js/` - All JavaScript files
- `images/` - Image assets
- `fonts/` - Font files

### Backend
- `functions/api/subscribe.js` - Email signup API (active)
- Cloudflare Pages automatically deploys this

### Documentation
- `README.md` - Main project README
- `docs/ARCHITECTURE.md` - System architecture
- `docs/SETUP.md` - Setup instructions

## Archived Files (For Reference)

- `docs/archive/` - Product sync documentation (not in use)
- `supabase/functions/archive/` - Product sync functions (not in use)
- `supabase/migrations/archive/` - Product sync migrations (not in use)

## Current Focus

- ✅ **Email Signup**: Working via Cloudflare Pages Function
- ✅ **Website**: Landing page and store page
- ⏳ **CRM Setup**: Future Supabase CRM tables
- ❌ **Product Sync**: Not needed (Shopify handles products)

