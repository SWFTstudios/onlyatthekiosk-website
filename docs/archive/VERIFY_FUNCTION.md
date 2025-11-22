# Verify Function Deployment

## 🔍 Check Function Status

The function returned "NOT_FOUND", which means either:
1. The function isn't deployed yet
2. The function name is different
3. Deployment failed

## ✅ Steps to Verify

### Step 1: Check if Function Exists

1. Go to Supabase Dashboard → **Edge Functions**
2. Look for `sync-airtable-products` in the list
3. Is it there?

### Step 2: Check Function Status

If the function exists:
1. Click on it to open
2. Check the status/health indicator
3. Is it deployed/active?

### Step 3: Check Function Logs

1. Open the function
2. Go to **Logs** tab
3. Are there any error messages?

### Step 4: Verify Function Name

Make sure the function is named exactly:
- ✅ `sync-airtable-products` (lowercase, with hyphens)
- ❌ NOT `sync_airtable_products` (underscores)
- ❌ NOT `SyncAirtableProducts` (camelCase)
- ❌ NOT `sync-airtable-products-v1` (with version)

## 🚀 Redeploy if Needed

If the function doesn't exist or deployment failed:

### Option A: Create New Function

1. Go to **Edge Functions** → **Create a new function**
2. Function name: `sync-airtable-products`
3. Copy code from `supabase/functions/sync-airtable-products/index.ts`
4. Paste into editor
5. Click **Deploy**

### Option B: Update Existing Function

1. Open the existing function
2. Replace all code with updated code
3. Click **Deploy** or **Save**

## 🧪 Test After Deployment

Once deployed, test it:

### Option 1: Via Dashboard
1. Open the function
2. Click **"Invoke function"** or **"Test"** button
3. Check **Logs** tab for results

### Option 2: Via Terminal
```bash
curl -X POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-airtable-products \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## ❓ Common Issues

### Issue 1: Function Name Mismatch
- **Symptom**: NOT_FOUND error
- **Fix**: Check exact function name in Dashboard matches the URL

### Issue 2: Deployment Failed
- **Symptom**: Function not in list or shows error
- **Fix**: Check deployment logs, fix any code errors, redeploy

### Issue 3: Function Not Active
- **Symptom**: Function exists but returns error
- **Fix**: Check function logs, verify code is correct

## 📋 Checklist

Before testing:
- [ ] Function exists in Edge Functions list
- [ ] Function name is exactly `sync-airtable-products`
- [ ] Function status shows as deployed/active
- [ ] Code is pasted correctly (no syntax errors)
- [ ] AIRTABLE_PAT secret is set

After deployment:
- [ ] Deployment completed without errors
- [ ] Can see function in Edge Functions list
- [ ] Test/Invoke button works
- [ ] Function logs show activity

## 🔗 Function URL

Once deployed correctly, the function URL should be:
```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/sync-airtable-products
```

If you see it in the Dashboard, the exact URL might be shown there - use that one for testing.

