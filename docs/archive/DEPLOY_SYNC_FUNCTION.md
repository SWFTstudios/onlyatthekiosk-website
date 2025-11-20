# Deploy Sync Function - Step by Step Guide

## ✅ Supabase CLI Installed

Supabase CLI has been installed on your machine. Now you need to deploy the sync function.

## Option A: Deploy via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard
   - Select your project: "Kiosk Website CMS"

2. **Create Edge Function**:
   - Go to **Edge Functions** in the left sidebar
   - Click **"Create a new function"**
   - Name it: `sync-airtable-products`

3. **Copy Function Code**:
   - Open the file: `supabase/functions/sync-airtable-products/index.ts`
   - Copy all the code
   - Paste it into the function editor in Supabase Dashboard

4. **Set Environment Variables**:
   - In the Edge Function settings, go to **Secrets**
   - Add secret:
     - **Name**: `AIRTABLE_PAT`
     - **Value**: `YOUR_AIRTABLE_PAT_TOKEN`

5. **Deploy**:
   - Click **"Deploy"** or **"Save"**

## Option B: Deploy via CLI (If you have CLI access)

### Step 1: Login to Supabase

Run in your terminal:
```bash
cd "/Users/elombe.kisala/Library/Mobile Documents/com~apple~CloudDocs/Work - SWFT Studios/Personal Projects/onlyatthekiosk/onlyatthekiosk-website"
supabase login
```

This will open a browser window for you to authenticate.

### Step 2: Link Your Project

1. Get your **Project Reference ID**:
   - Go to Supabase Dashboard → Project Settings → General
   - Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

2. Link the project:
```bash
supabase link --project-ref YOUR_PROJECT_REF_ID
```

Replace `YOUR_PROJECT_REF_ID` with your actual project reference ID.

### Step 3: Set Airtable Token Secret

```bash
supabase secrets set AIRTABLE_PAT=YOUR_AIRTABLE_PAT_TOKEN
```

### Step 4: Deploy the Function

```bash
supabase functions deploy sync-airtable-products
```

### Step 5: Test the Function

After deployment, you can test it:

```bash
curl -X POST https://YOUR_PROJECT_REF_ID.supabase.co/functions/v1/sync-airtable-products \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

Or test via Supabase Dashboard:
- Go to Edge Functions → `sync-airtable-products`
- Click **"Invoke function"**
- Check the logs for results

## Function Details

- **Function Name**: `sync-airtable-products`
- **Location**: `supabase/functions/sync-airtable-products/index.ts`
- **Airtable Table ID**: `tbljwWvetx3bScjJ2`
- **Base ID**: `appA3qQw0NAqz8ru3`

## What the Function Does

1. Fetches all products from Airtable Products table
2. Maps Airtable fields to Supabase schema
3. Creates new products in Supabase if they don't exist
4. Updates existing products if they already exist
5. Deletes products from Supabase if they no longer exist in Airtable

## Verification

After deployment, check if it worked:

1. **Check function logs** in Supabase Dashboard → Edge Functions → `sync-airtable-products` → Logs

2. **Verify products synced** in Supabase:
   ```sql
   SELECT * FROM public.products;
   SELECT * FROM public.store_products;
   ```

3. **Check sync results**:
   - The function returns a JSON response with:
     - `success`: true/false
     - `operations`: { created, updated, deleted }
     - `total`: number of records processed

## Troubleshooting

### Function not found after deployment:
- Check function name matches exactly: `sync-airtable-products`
- Verify you're in the correct project

### Authentication errors:
- Verify `AIRTABLE_PAT` secret is set correctly
- Check token hasn't expired

### Field mapping errors:
- Check logs in Supabase Dashboard
- Verify Airtable table ID is correct: `tbljwWvetx3bScjJ2`

## Next Steps After Deployment

1. ✅ Test manual sync
2. ✅ Verify products appear in Supabase
3. ✅ Set up automatic sync (Airtable automation or scheduled cron)
4. ✅ Update website to query Supabase REST API

