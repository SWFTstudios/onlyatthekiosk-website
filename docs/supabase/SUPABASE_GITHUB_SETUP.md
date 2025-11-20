# Supabase to GitHub Integration Guide

## Overview

This guide will help you connect your Supabase project to your GitHub repository (`SWFTstudios/onlyatthekiosk-website`) for automatic deployments.

## Prerequisites

1. **Supabase Project**: Active Supabase project
2. **GitHub Repository**: `SWFTstudios/onlyatthekiosk-website`
3. **Supabase CLI** (optional, for local development)

## Step 1: Connect GitHub to Supabase Dashboard

### In Supabase Dashboard:

1. Go to **Project Settings** → **Integrations**
2. Under **GitHub Integration**, click **Authorize GitHub**
3. You'll be redirected to GitHub authorization page
4. Click **Authorize Supabase** to grant access
5. You'll be redirected back to Supabase

### Configure Integration:

1. **Choose Repository**: Select `SWFTstudios/onlyatthekiosk-website`
2. **Supabase Directory Path**: 
   - If you have a `supabase/` folder: `supabase`
   - If not, we'll create one: leave as `supabase` (default)
3. **Options**:
   - ✅ **Automatic branching**: Creates Supabase branches for each GitHub branch
   - ✅ **Supabase changes only**: Only create branches when Supabase files change
   - ✅ **Deploy to production**: Auto-deploy when pushing to main branch
4. Click **Enable integration**

## Step 2: Initialize Supabase Directory (If Needed)

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase in your project
cd "/Users/elombe.kisala/Library/Mobile Documents/com~apple~CloudDocs/Work - SWFT Studios/Personal Projects/onlyatthekiosk/onlyatthekiosk-website"
supabase init
```

### Option B: Create Directory Manually

If you don't want to use CLI, create this structure:

```
onlyatthekiosk-website/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql (optional)
```

## Step 3: Create Supabase Configuration

Create `supabase/config.toml`:

```toml
# Supabase Configuration
# https://supabase.com/docs/guides/cli

project_id = "your-project-id"  # Get from Supabase dashboard

[api]
enabled = true
port = 54321
schemas = ["public", "airtable"]
extra_search_path = ["public", "extensions"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323

[inbucket]
enabled = true
port = 54324
```

## Step 4: Create Initial Migration (Optional)

If you want to track database migrations:

```bash
# Pull your current database schema
supabase db pull --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres"
```

Or create `supabase/migrations/20250101000000_initial.sql`:

```sql
-- Initial migration
-- This will be run automatically when deploying

-- Example: Create a products view from Airtable
CREATE OR REPLACE VIEW public.store_products AS
SELECT 
  handle,
  title,
  "Variant Price" as price,
  currency,
  "Image Src" as primary_image,
  "Secondary Image" as secondary_image,
  "Category Display" as category,
  status
FROM airtable.products
WHERE published = true AND status = 'active';
```

## Step 5: Commit and Push to GitHub

```bash
# Add Supabase directory
git add supabase/

# Commit
git commit -m "Add Supabase configuration and migrations"

# Push to GitHub
git push origin main
```

## Step 6: Verify Integration

### Check Supabase Dashboard:

1. Go to **Database** → **Migrations**
2. You should see your migration listed
3. Status should show as "Applied"

### Check GitHub:

1. Go to your repository: `SWFTstudios/onlyatthekiosk-website`
2. Check that `supabase/` directory exists
3. If you create a PR, Supabase will comment with deployment status

## Step 7: Configure Automatic Deployments

### For Production (main branch):

1. In Supabase Dashboard → **Project Settings** → **Integrations** → **GitHub**
2. Enable **Deploy to production**
3. Select branch: `main`
4. This will automatically:
   - Run migrations on push to main
   - Deploy Edge Functions (if any)
   - Deploy Storage buckets (if configured)

### For Preview Branches:

1. Enable **Automatic branching**
2. When you create a PR, Supabase creates a preview branch
3. Preview branch gets its own database and API
4. Perfect for testing changes before production

## Step 8: Create GitHub Actions Workflow (Optional)

Create `.github/workflows/supabase.yml`:

```yaml
name: Supabase Integration

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
    paths:
      - 'supabase/**'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Supabase Preview
        uses: fountainhead/action-wait-for-check@v1.2.0
        id: check
        with:
          checkName: Supabase Preview
          ref: ${{ github.event.pull_request.head.sha }}
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Fail if Supabase check failed
        if: ${{ steps.check.outputs.conclusion == 'failure' }}
        run: exit 1
```

## What Gets Deployed Automatically

When you push to GitHub:

✅ **Database Migrations**: All SQL files in `supabase/migrations/`  
✅ **Edge Functions**: Functions declared in `config.toml`  
✅ **Storage Buckets**: Buckets declared in `config.toml`  
❌ **API Changes**: Not deployed (configured in dashboard)  
❌ **Auth Changes**: Not deployed (configured in dashboard)  
❌ **Seed Files**: Not deployed to production (only preview branches)

## Troubleshooting

### Migration Fails:

1. Check Supabase Dashboard → **Database** → **Migrations** for errors
2. Check email notifications (if enabled)
3. Review SQL syntax in migration files

### Integration Not Working:

1. Verify GitHub authorization in Supabase Dashboard
2. Check repository path is correct
3. Ensure `supabase/` directory exists in repo
4. Check branch name matches configuration

### Preview Branch Issues:

1. Preview branches don't copy production data
2. Use `seed.sql` for test data
3. Each preview branch has its own database

## Next Steps

1. **Create Edge Functions** (if needed) for product API
2. **Set up Storage** for product images
3. **Configure Row Level Security** for public product access
4. **Create API endpoints** using Supabase REST API

## Useful Commands

```bash
# Link local project to Supabase
supabase link --project-ref your-project-ref

# Create new migration
supabase migration new create_products_view

# Apply migrations locally
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

