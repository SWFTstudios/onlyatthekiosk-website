# Airtable → Supabase Sync Setup Checklist

## ✅ Complete Setup Checklist

### Step 1: Create Supabase Products Table

- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Copy contents of `supabase/migrations/20250101000000_create_products_table.sql`
- [ ] Run the SQL to create the `products` table
- [ ] Verify table created: `SELECT * FROM public.products;`
- [ ] Test view: `SELECT * FROM public.store_products;`

### Step 2: Set Up Airtable Table Structure

- [ ] Open Airtable: https://airtable.com/appA3qQw0NAqz8ru3/tblH1dZDvuUWfKuWb
- [ ] Add required fields (matching Shopify structure):
  - [ ] Handle (Single line text)
  - [ ] Title (Single line text)
  - [ ] Body (HTML) (Long text)
  - [ ] Vendor (Single line text)
  - [ ] Variant Price (Number)
  - [ ] Currency (Single select: SEK, USD, EUR)
  - [ ] Image Src (Attachment)
  - [ ] Secondary Image (Attachment)
  - [ ] Featured (Checkbox)
  - [ ] Published (Checkbox)
  - [ ] Status (Single select: active, draft, archived)
  - [ ] Category Display (Single select)
  - [ ] Type (Single select)
  - [ ] Tags (Multiple select)
- [ ] Verify field names match exactly (case-sensitive)

### Step 3: Deploy Supabase Edge Function

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Set secrets:
  ```bash
  supabase secrets set AIRTABLE_PAT=YOUR_AIRTABLE_PAT_TOKEN
  ```
- [ ] Deploy function: `supabase functions deploy sync-airtable-products`
- [ ] Verify function deployed in Supabase Dashboard → Edge Functions

### Step 4: Test Manual Sync

- [ ] Add test product in Airtable:
  - Handle: `test-product`
  - Title: `Test Product`
  - Variant Price: `1000`
  - Currency: `SEK`
  - Published: ✓
  - Status: `active`
  - Featured: ✓
- [ ] Trigger sync manually:
  - Go to Supabase Dashboard → Edge Functions → `sync-airtable-products` → Invoke
  - OR: `curl -X POST https://your-project.supabase.co/functions/v1/sync-airtable-products -H "Authorization: Bearer YOUR_ANON_KEY"`
- [ ] Verify product synced:
  ```sql
  SELECT * FROM public.products;
  SELECT * FROM public.store_products;
  ```

### Step 5: Set Up Automatic Sync

**Option A: Airtable Automation (Recommended - Real-time)**

- [ ] Go to Airtable → Automations
- [ ] Create new automation:
  - [ ] Trigger: "When record matches conditions" OR "When record is created/updated"
  - [ ] Condition: Always (or specific conditions)
  - [ ] Action: "Run script" or "Send web request"
  - [ ] URL: `https://your-project.supabase.co/functions/v1/sync-airtable-products`
  - [ ] Method: `POST`
  - [ ] Headers:
    - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
    - `Content-Type: application/json`
  - [ ] Body: `{}`
- [ ] Save and enable automation

**Option B: Scheduled Sync (Every 5 minutes)**

- [ ] Run this SQL in Supabase:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  SELECT cron.schedule(
    'sync-airtable-products',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/sync-airtable-products',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $$
  );
  ```

### Step 6: Update Website to Query Supabase

- [ ] Get Supabase URL and Anon Key from Supabase Dashboard → Settings → API
- [ ] Create JavaScript file to fetch products:
  ```javascript
  const SUPABASE_URL = 'https://your-project.supabase.co'
  const SUPABASE_ANON_KEY = 'your-anon-key'
  
  async function fetchProducts() {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/store_products?featured=eq.true&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )
    return await response.json()
  }
  ```
- [ ] Update `store.html` to fetch and display products from Supabase
- [ ] Test: Verify products display correctly on store page

## 🎯 Quick Start Commands

```bash
# 1. Link Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# 2. Set Airtable token
supabase secrets set AIRTABLE_PAT=YOUR_AIRTABLE_PAT_TOKEN

# 3. Deploy sync function
supabase functions deploy sync-airtable-products

# 4. Test sync manually
curl -X POST https://your-project.supabase.co/functions/v1/sync-airtable-products \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

## 📝 Files Created

- `supabase/migrations/20250101000000_create_products_table.sql` - Supabase table schema
- `supabase/functions/sync-airtable-products/index.ts` - Sync Edge Function
- `COMPLETE_SYNC_SETUP.md` - Detailed setup guide
- `SETUP_CHECKLIST.md` - This checklist
- `AIRTABLE_TO_SUPABASE_SYNC.md` - Architecture overview

## 🔍 Verification

After setup, verify everything works:

1. **Airtable**: Add/edit a product
2. **Supabase**: Check products synced: `SELECT * FROM public.products;`
3. **Website**: Verify products display on store page
4. **Automation**: Verify sync triggers automatically

## 🆘 Troubleshooting

- **Products not syncing**: Check Edge Function logs in Supabase Dashboard
- **Field mismatch errors**: Verify Airtable field names match exactly (case-sensitive)
- **Sync not triggering**: Verify automation is enabled in Airtable
- **Website not loading**: Check Supabase REST API URL and Anon Key are correct

