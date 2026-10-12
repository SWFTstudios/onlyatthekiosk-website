# Only at The Kiosk - Website

Official website for Only at The Kiosk — Exclusive drops you can't find anywhere else.

## 🏁 KIOSK Glass (magazine · radio · film · store)

The home page and the new sections run on the **KIOSK Glass** design system:

| Page | What it is |
| --- | --- |
| `index.html` | Issue home: hero film, Garage rail, films, KIOSK Radio, Vault, Dispatch signup |
| `garage.html` | Archive of films, photo stories and interviews with filters |
| `story.html?s=<slug>` | A story page: specs, story, subjects, slideshow, colour guide, behind the scenes, interview, shop the look |
| `radio.html` | Phonk DJ mixes and tracklists |
| `vault.html` | Store for mixes, films, LUT packs, accessories and apparel |

All content lives in `js/kiosk-content.js`. Rendering is in `js/kiosk-glass.js` and styles in `css/kiosk-glass.css`.
**To add a shoot, film, mix or product, see [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md).**

## 🏗️ Architecture

### **Shopify** - E-commerce Platform
- Products management
- Inventory tracking
- Order processing
- Payments & shipping

### **Supabase** - CRM & Backend
- Customer data
- Email subscriptions
- Lead management
- Customer interactions

### **Website** - Frontend
- Static site (HTML/CSS/JS)
- Deployed on Cloudflare Pages
- Email signup integration
- Product display (Shopify)

## 📁 Project Structure

```
onlyatthekiosk-website/
├── index.html              # Landing/Coming Soon page
├── store.html              # Store page
├── css/                    # Stylesheets
├── js/                     # JavaScript files
├── images/                 # Images and assets
├── fonts/                  # Font files
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       └── subscribe.js    # Email signup endpoint
├── supabase/               # Supabase configuration
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge Functions (archived/unused)
└── docs/                   # Documentation
```

See `PROJECT_STRUCTURE.md` for detailed project organization.

## 🚀 Quick Start

### Prerequisites
- Cloudflare Pages account
- Supabase account (for future CRM features)
- Airtable account (for email subscriptions)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SWFTstudios/onlyatthekiosk-website.git
   cd onlyatthekiosk-website
   ```

2. **Configure Cloudflare Pages**
   - Connect your GitHub repository
   - Build command: (leave empty or use `./build.sh`)
   - Output directory: `/` (root)

3. **Set up Environment Variables**
   - In Cloudflare Pages → Settings → Environment Variables:
     - `AIRTABLE_ACCESS_TOKEN`: Your Airtable Personal Access Token
     - `AIRTABLE_BASE_ID`: Your Airtable Base ID

4. **Deploy**
   - Push to `main` branch triggers automatic deployment
   - Or deploy manually via Cloudflare Pages dashboard

## 📧 Email Signup

Email signups are handled via:
- **Frontend**: `js/email-signup.js` - Form handling
- **Backend**: `functions/api/subscribe.js` - Cloudflare Pages Function
- **Storage**: Airtable "Incoming Interest" table

### How It Works

1. User submits email on website
2. Form calls `/api/subscribe` endpoint
3. Cloudflare Pages Function validates and stores email in Airtable
4. Success/error message displayed to user

See `docs/EMAIL_SIGNUP.md` for detailed documentation.

## 🔧 Technologies

- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Backend**: Cloudflare Pages Functions
- **Database**: Airtable (email subscriptions)
- **Deployment**: Cloudflare Pages
- **CDN**: Cloudflare

## 📚 Documentation

See `docs/` directory for detailed documentation:
- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/SETUP.md` - Setup instructions
- `docs/EMAIL_SIGNUP.md` - Email signup integration
- `docs/SUPABASE_SETUP.md` - Supabase setup guide
- `docs/archive/` - Archived documentation (product sync, not in use)

## 🔒 Environment Variables

Required environment variables in Cloudflare Pages:

- `AIRTABLE_ACCESS_TOKEN` - Airtable Personal Access Token
- `AIRTABLE_BASE_ID` - Airtable Base ID

## 🧪 Development

### Local Development

1. Serve files locally:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve .
   ```

2. Test email signup:
   - Update `js/email-signup.js` if needed
   - Form submits to `/api/subscribe` (works on Cloudflare Pages)

### Testing

- Test email signup form on local server
- Verify Cloudflare Pages Function logs
- Check Airtable for stored emails

## 📝 License

Private project - All rights reserved

## 🔗 Links

- **Website**: https://onlyatthekiosk.com
- **Store**: https://onlyatthekiosk.com/store
- **GitHub**: https://github.com/SWFTstudios/onlyatthekiosk-website
