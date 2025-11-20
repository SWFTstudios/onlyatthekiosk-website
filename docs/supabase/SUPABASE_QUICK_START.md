# Supabase Integration Quick Start Checklist

## 🎯 Goal
Connect Supabase to:
1. ✅ Airtable (to read Products table)
2. ✅ GitHub (for automatic deployments)

## Part 1: Supabase ↔ Airtable Connection

### Prerequisites Checklist:
- [ ] Supabase project created
- [ ] Airtable Personal Access Token (PAT) created
- [ ] Airtable Base ID noted (`appA3qQw0NAqz8ru3`)
- [ ] Airtable Products table ID noted

### Steps:

1. **Get Airtable PAT**:
   - Go to: https://airtable.com/create/tokens
   - Create token with scopes: `data.records:read`, `schema.bases:read`
   - Copy token (starts with `pat...`)

2. **Get Table ID**:
   - In Airtable, go to Help → API documentation
   - Find your "Products" table ID (starts with `tbl...`)

3. **Run SQL in Supabase Dashboard**:
   ```sql
   -- Enable extensions
   CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;
   
   -- Create wrapper
   CREATE FOREIGN DATA WRAPPER airtable_wrapper
     HANDLER airtable_fdw_handler
     VALIDATOR airtable_fdw_validator;
   
   -- Store token in Vault (replace YOUR_TOKEN)
   SELECT vault.create_secret(
     'patYOUR_TOKEN_HERE',
     'airtable_api_key',
     'Airtable API key for Products table'
   );
   -- ⚠️ SAVE THE KEY_ID RETURNED ABOVE
   
   -- Create server (replace KEY_ID from above)
   CREATE SERVER airtable_server
     FOREIGN DATA WRAPPER airtable_wrapper
     OPTIONS (api_key_id '<KEY_ID>');
   
   -- Create schema
   CREATE SCHEMA IF NOT EXISTS airtable;
   
   -- Create foreign table (replace base_id and table_id)
   CREATE FOREIGN TABLE airtable.products (
     handle text,
     title text,
     "Variant Price" numeric,
     currency text,
     "Image Src" text,
     "Secondary Image" text,
     "Category Display" text,
     featured boolean,
     published boolean,
     status text
     -- Add more fields as needed
   )
   SERVER airtable_server
   OPTIONS (
     base_id 'appA3qQw0NAqz8ru3',  -- Your base ID
     table_id 'tblXXXX'  -- Your Products table ID
   );
   ```

4. **Test Connection**:
   ```sql
   SELECT * FROM airtable.products LIMIT 5;
   ```

## Part 2: Supabase ↔ GitHub Connection

### Steps:

1. **In Supabase Dashboard**:
   - Go to **Project Settings** → **Integrations** → **GitHub**
   - Click **Authorize GitHub**
   - Authorize Supabase on GitHub
   - Select repository: `SWFTstudios/onlyatthekiosk-website`
   - Set path: `supabase` (or create folder)
   - Enable options:
     - ✅ Automatic branching
     - ✅ Deploy to production
   - Click **Enable integration**

2. **Create Supabase Directory** (if needed):
   ```bash
   cd "/Users/elombe.kisala/Library/Mobile Documents/com~apple~CloudDocs/Work - SWFT Studios/Personal Projects/onlyatthekiosk/onlyatthekiosk-website"
   
   # Option 1: Using CLI
   supabase init
   
   # Option 2: Manual
   mkdir -p supabase/migrations
   ```

3. **Create `supabase/config.toml`**:
   ```toml
   project_id = "your-project-id"
   
   [api]
   enabled = true
   port = 54321
   schemas = ["public", "airtable"]
   ```

4. **Create Initial Migration** (optional):
   Create `supabase/migrations/20250101000000_initial.sql`:
   ```sql
   -- Create view for store products
   CREATE OR REPLACE VIEW public.store_products AS
   SELECT 
     handle,
     title,
     "Variant Price" as price,
     currency,
     "Image Src" as primary_image,
     "Secondary Image" as secondary_image,
     "Category Display" as category
   FROM airtable.products
   WHERE published = true AND status = 'active';
   ```

5. **Commit and Push**:
   ```bash
   git add supabase/
   git commit -m "Add Supabase configuration"
   git push origin main
   ```

6. **Verify**:
   - Check Supabase Dashboard → **Database** → **Migrations**
   - Check GitHub repository for `supabase/` folder
   - Create a test PR to see preview branch creation

## 🎉 You're Done!

### What You Can Do Now:

1. **Query Products from Supabase**:
   ```sql
   SELECT * FROM airtable.products WHERE featured = true;
   ```

2. **Use Supabase REST API**:
   ```
   GET https://your-project.supabase.co/rest/v1/store_products?featured=eq.true
   ```

3. **Automatic Deployments**:
   - Push to `main` → Auto-deploys to production
   - Create PR → Creates preview branch

## 📚 Reference Documents

- `SUPABASE_AIRTABLE_SETUP.md` - Detailed Airtable connection guide
- `SUPABASE_GITHUB_SETUP.md` - Detailed GitHub integration guide
- `AIRTABLE_PRODUCTS_TABLE_STRUCTURE.md` - Airtable table schema
- `PRODUCT_BLOCK_MAPPING.md` - HTML to data mapping

## 🔗 Useful Links

- Supabase Dashboard: https://supabase.com/dashboard
- Airtable API Docs: https://airtable.com/api
- Supabase Airtable Wrapper: https://supabase.com/docs/guides/database/extensions/wrappers/airtable
- Supabase GitHub Integration: https://supabase.com/docs/guides/deployment/branching/github-integration

