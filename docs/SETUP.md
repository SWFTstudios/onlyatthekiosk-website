# Setup Guide

## Quick Start

### 1. Environment Variables

Set these in Cloudflare Pages → Settings → Environment Variables:

- `AIRTABLE_ACCESS_TOKEN`: Your Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Your Airtable Base ID

### 2. Deploy to Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Build command: Leave **empty**
3. Output directory: Leave **empty** (or `/`)
4. Deploy automatically on push to `main`

### 3. Verify Deployment

- Check website loads: https://onlyatthekiosk.com
- Test email signup form
- Verify emails appear in Airtable

## File Structure

```
/
├── index.html              # Landing page
├── store.html              # Store page
├── css/                    # Stylesheets
├── js/                     # JavaScript
├── images/                 # Images
├── fonts/                  # Fonts
├── functions/
│   └── api/
│       └── subscribe.js    # Email signup API
├── docs/                   # Documentation
└── supabase/              # Supabase config (for future use)
```

## Key Files

- `index.html` - Main landing/coming soon page
- `store.html` - Store page
- `js/email-signup.js` - Email signup form handler
- `functions/api/subscribe.js` - Email signup API endpoint
- `css/onlyatthekiosk.css` - Main stylesheet

## Development

1. Open `index.html` in browser for local preview
2. Email signup requires deployed Cloudflare Pages Function
3. Make changes and push to `main` for deployment

