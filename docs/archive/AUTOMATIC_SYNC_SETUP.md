# Automatic Sync Setup - Airtable → Supabase

## Overview

Set up automatic syncing so that when you add, update, or delete products in Airtable, Supabase automatically updates.

## Option 1: Airtable Automation (Recommended - Real-time)

This triggers the sync function whenever products change in Airtable.

### Step 1: Go to Airtable Automations

1. Open your Airtable base: https://airtable.com/appA3qQw0NAqz8ru3
2. Click **"Automations"** in the top menu
3. Click **"Create a new automation"**

### Step 2: Set Trigger

1. **Name your automation**: "Sync Products to Supabase"
2. **Choose trigger**: 
   - Option A: **"When record matches conditions"** - Triggers when specific conditions are met
   - Option B: **"When record is created"** - Triggers on new records only
   - Option C: **"When record is updated"** - Triggers when existing records change
   - Option D: **"When record is created or updated"** - Triggers on both (BEST for full sync)
   
   **Recommended**: Choose **"When record matches conditions"** with condition: **"Always"** (this will trigger on any create/update/delete)

### Step 3: Add Action - Run Script

1. Click **"Add action"** → **"Run script"**
2. **Script type**: Choose **"JavaScript"** or **"Python"**

#### JavaScript Script:
```javascript
// Sync all products from Airtable to Supabase
const SUPABASE_FUNCTION_URL = 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('Sync completed:', result);
    
    if (result.success) {
        output.markdown(`✅ **Sync Successful**\n\n${result.summary || 'Products synced successfully'}`);
    } else {
        output.markdown(`❌ **Sync Failed**\n\n${result.error || 'Unknown error'}`);
    }
} catch (error) {
    output.markdown(`❌ **Error**: ${error.message}`);
}
```

#### Python Script:
```python
import requests

SUPABASE_FUNCTION_URL = 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor'
SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'

try:
    response = requests.post(
        SUPABASE_FUNCTION_URL,
        headers={
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json'
        },
        json={}
    )
    
    result = response.json()
    
    if result.get('success'):
        print(f"✅ Sync Successful: {result.get('summary', 'Products synced successfully')}")
    else:
        print(f"❌ Sync Failed: {result.get('error', 'Unknown error')}")
except Exception as error:
    print(f"❌ Error: {str(error)}")
```

### Step 4: Save and Enable

1. Click **"Save"** at the bottom
2. Click **"Turn on"** to enable the automation
3. Test it by adding/editing a product in Airtable

### Step 5: Test the Automation

1. Add a new product in Airtable Products table
2. Wait a few seconds
3. Check Supabase:
   - Go to **Table Editor** → `products` table
   - Or run SQL: `SELECT * FROM public.products ORDER BY created_at DESC LIMIT 1;`
4. Check automation logs in Airtable → **Automations** → Your automation → **Run history**

## Option 2: Scheduled Sync (Every X Minutes)

This runs the sync function on a schedule (e.g., every 5 minutes).

### Step 1: Enable pg_cron Extension

Run this SQL in Supabase Dashboard → **SQL Editor**:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Step 2: Schedule Sync Job

Run this SQL to schedule sync every 5 minutes:

```sql
-- Schedule sync to run every 5 minutes
SELECT cron.schedule(
  'sync-airtable-products',  -- Job name
  '*/5 * * * *',             -- Every 5 minutes (cron syntax)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Step 3: Verify Schedule

Check scheduled jobs:

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-airtable-products')
ORDER BY start_time DESC 
LIMIT 10;
```

### Step 4: Adjust Schedule (Optional)

Change the schedule:

```sql
-- Update to run every 10 minutes instead
SELECT cron.unschedule('sync-airtable-products');
SELECT cron.schedule(
  'sync-airtable-products',
  '*/10 * * * *',  -- Every 10 minutes
  $$SELECT net.http_post(...)$$
);
```

### Common Cron Schedules:

- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight

## Option 3: Manual Trigger (On-Demand)

For manual sync, you can:

### Via Supabase Dashboard:
1. Go to **Edge Functions** → `sync-airtable-products`
2. Click **"Invoke function"** button
3. Check **Logs** for results

### Via Terminal:
```bash
curl -X POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Via Test Script:
```bash
./test_sync.sh
```

## Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Airtable Automation** | ✅ Real-time<br>✅ Triggers on changes<br>✅ No server resources | ⚠️ Requires Airtable Pro<br>⚠️ Airtable limits | Production use |
| **Scheduled (pg_cron)** | ✅ Always runs<br>✅ No Airtable limits<br>✅ Free | ⚠️ Not real-time<br>⚠️ Uses server resources | Development/testing |
| **Manual** | ✅ Full control<br>✅ No automation needed | ❌ Not automatic | Testing/troubleshooting |

## Recommended Setup

**For Production:**
- Use **Airtable Automation** for real-time sync when products change
- Set up as **"When record is created or updated"** trigger
- Add error handling and notifications

**For Backup:**
- Also set up **Scheduled Sync** (every 15-30 minutes) as a backup
- This ensures nothing is missed if automation fails

## Troubleshooting

### Automation Not Triggering:
1. Check automation is enabled in Airtable
2. Check automation run history for errors
3. Verify Supabase function URL is correct
4. Check Supabase function logs

### Scheduled Sync Not Running:
1. Verify pg_cron extension is enabled
2. Check cron job exists: `SELECT * FROM cron.job;`
3. Check job run details for errors
4. Verify function URL and authentication

### Sync Failing:
1. Check Supabase Edge Function logs
2. Verify AIRTABLE_PAT secret is set correctly
3. Check Airtable table ID is correct
4. Verify products have required fields (Handle, Title)

## Testing

After setting up automatic sync:

1. **Add a product** in Airtable
2. **Wait a few seconds** (or minutes if using scheduled)
3. **Check Supabase**:
   ```sql
   SELECT * FROM public.products ORDER BY created_at DESC LIMIT 5;
   ```
4. **Verify it appears** in the `products` table
5. **Edit the product** in Airtable
6. **Wait and check again** - should be updated in Supabase

## Next Steps

1. ✅ Set up automatic sync (choose one method above)
2. ✅ Test by adding/editing a product
3. ✅ Monitor sync status in logs
4. ✅ Set up notifications (optional) for sync failures
5. ✅ Update website to query Supabase REST API

