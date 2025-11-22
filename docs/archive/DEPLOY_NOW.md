# Deploy Sync Function - Quick Guide

## ✅ Already Done:
- ✅ Supabase CLI installed
- ✅ AIRTABLE_PAT secret set in Supabase Dashboard
- ✅ Function code ready: `supabase/functions/sync-airtable-products/index.ts`

## 🚀 Deploy via Supabase Dashboard (Easiest)

### Step 1: Open Edge Functions in Dashboard

1. Go to: https://supabase.com/dashboard/project/YOUR_SUPABASE_PROJECT_REF/functions
2. Click **"Create a new function"** or **"New Function"**

### Step 2: Create Function

1. **Function Name**: `sync-airtable-products`
2. Click **"Create function"**

### Step 3: Copy Function Code

1. Open this file: `supabase/functions/sync-airtable-products/index.ts`
2. Select all code (Cmd+A) and copy (Cmd+C)
3. In Supabase Dashboard function editor, paste the code
4. The code is ready - it's already configured with:
   - ✅ Table ID: `tbljwWvetx3bScjJ2`
   - ✅ Base ID: `appA3qQw0NAqz8ru3`
   - ✅ Will use AIRTABLE_PAT secret (already set)

### Step 4: Deploy

1. Click **"Deploy"** button (top right)
2. Wait for deployment to complete

### Step 5: Test

After deployment, test it:

**Option A: Via Dashboard**
- Click **"Invoke function"** button
- Check the **Logs** tab for results

**Option B: Via Terminal**
```bash
cd "/Users/elombe.kisala/Library/Mobile Documents/com~apple~CloudDocs/Work - SWFT Studios/Personal Projects/onlyatthekiosk/onlyatthekiosk-website"
./test_sync.sh
```

**Option C: Manual curl**
```bash
curl -X POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-airtable-products \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

## 📋 Function Details

- **Function Name**: `sync-airtable-products`
- **Project URL**: https://YOUR_SUPABASE_PROJECT_REF.supabase.co
- **Function Endpoint**: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-airtable-products`
- **Airtable Table**: Products (`tbljwWvetx3bScjJ2`)

## ✅ After Deployment

1. Run the sync function
2. Verify products appear in Supabase:
   - Go to **Table Editor** → `products` table
   - Or run SQL: `SELECT * FROM public.products;`
3. Check the `store_products` view: `SELECT * FROM public.store_products;`

## 🎯 Next Steps

Once deployed and tested:
1. ✅ Set up automatic sync (Airtable automation or scheduled)
2. ✅ Update website to query Supabase REST API
3. ✅ Test end-to-end flow

