# Architecture Overview

## System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Shopify   │         │   Supabase   │         │   Website   │
│             │         │              │         │             │
│  Products   │         │     CRM      │────────▶│  Frontend   │
│  Inventory  │         │   Customers  │         │             │
│   Orders    │         │  Email Subs  │         │  store.html │
│  Payments   │         │    Leads     │         │  index.html │
└─────────────┘         └──────────────┘         └─────────────┘
                                                          │
                                                          │
                                                  ┌───────▼───────┐
                                                  │ Cloudflare    │
                                                  │ Pages         │
                                                  │ Functions     │
                                                  └───────────────┘
                                                          │
                                                          │ Email Signup
                                                          ▼
                                                  ┌───────────────┐
                                                  │   Airtable    │
                                                  │ Incoming      │
                                                  │ Interest      │
                                                  └───────────────┘
```

## Components

### **Shopify** - E-commerce
- **Products**: Product catalog and management
- **Inventory**: Stock tracking and management
- **Orders**: Order processing and fulfillment
- **Payments**: Payment processing
- **Shipping**: Shipping and fulfillment

### **Supabase** - CRM & Backend Services
- **Customers**: Customer database and profiles
- **Email Subscriptions**: Newsletter and marketing emails
- **Lead Management**: Lead tracking and qualification
- **Customer Interactions**: Interaction history and notes

### **Website** (Frontend)
- **Landing Page**: Coming soon page with email signup
- **Store Page**: Product display (from Shopify)
- **Email Signup**: Newsletter subscription form

### **Cloudflare Pages Functions**
- **Email Signup API**: `/api/subscribe` - Handles email signup form submissions
- Stores email addresses in Airtable

### **Airtable** - Email Storage
- **Incoming Interest Table**: Stores email signups from website
- Used for lead management and email marketing

## Data Flow

### Email Signup Flow
1. User enters email on website
2. Form submits to `/api/subscribe` (Cloudflare Pages Function)
3. Function validates email and stores in Airtable
4. User sees success/error message

### Product Display Flow
1. Website queries Shopify Storefront API (if needed)
2. Products displayed on store page
3. Users can browse products

### CRM Flow (Future)
1. Customer data synced from Shopify to Supabase
2. Email subscriptions tracked in Supabase
3. Lead management and segmentation in Supabase

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Cloudflare Pages Functions
- **Database**: Supabase (PostgreSQL), Airtable
- **E-commerce**: Shopify
- **Hosting**: Cloudflare Pages
- **CDN**: Cloudflare

## Key Features

- ✅ Email signup form with validation
- ✅ Responsive design (mobile-friendly)
- ✅ Fast loading (Cloudflare CDN)
- ✅ SEO optimized (meta tags, schema markup)
- ✅ Analytics integration (Google Analytics)

