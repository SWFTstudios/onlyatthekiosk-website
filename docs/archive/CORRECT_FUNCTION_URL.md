# ✅ Correct Function URL

## 📍 Function Endpoint

Your sync function is accessible at:

```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor
```

**Note**: The function name is `sync-airtable-products`, but the slug/endpoint is `super-processor`.

## 🧪 Test the Function

Use this command to test the sync:

```bash
curl -X POST https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📋 Function Details

- **Function Name**: `sync-airtable-products`
- **Function Slug**: `super-processor`
- **Endpoint URL**: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor`
- **Created**: Thursday, November 20, 2025 3:34 PM
- **Last Updated**: Thursday, November 20, 2025 3:47 PM
- **Deployments**: 3

## 🚀 For Future Syncs

When setting up:
- **Airtable Automation**: Use `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor`
- **Scheduled Sync (pg_cron)**: Use `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/super-processor`
- **Manual Testing**: Use the URL above

## ✅ Status

The function is deployed and ready to use! The endpoint `/v1/super-processor` is the correct URL.

