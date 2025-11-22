# Troubleshooting Email Signup (405 Error)

## Issue: 405 Method Not Allowed on Live Site

If you're seeing `POST /api/subscribe 405 (Method Not Allowed)` on your live site, this means the Cloudflare Pages Function isn't being recognized or deployed correctly.

## Quick Checks

### 1. Verify Function File Location
The function must be at:
```
functions/api/subscribe.js
```

### 2. Verify Function Export
The function must export `onRequest`:
```javascript
export async function onRequest(context) {
  // ...
}
```

### 3. Check Cloudflare Pages Deployment
1. Go to Cloudflare Dashboard → Pages → Your Project
2. Check the latest deployment
3. Look for any build errors
4. Verify the `functions/` directory is included in deployment

### 4. Check Function Logs
1. Go to Cloudflare Dashboard → Pages → Your Project → Functions
2. Check if `/api/subscribe` appears in the functions list
3. View logs for any errors

### 5. Test Function Directly
Try accessing the health check endpoint:
```
GET https://yourdomain.com/api/subscribe
```

Should return:
```json
{
  "status": "ok",
  "service": "email-subscription",
  "method": "GET"
}
```

## Common Issues

### Issue 1: Function Not Deployed
**Symptom**: 405 error, function doesn't appear in Cloudflare dashboard

**Solution**:
1. Verify `functions/api/subscribe.js` exists in your repository
2. Push to `main` branch to trigger deployment
3. Wait for deployment to complete
4. Check Cloudflare Pages → Functions tab

### Issue 2: Environment Variables Missing
**Symptom**: Function exists but returns 500 error

**Solution**:
1. Go to Cloudflare Pages → Settings → Environment Variables
2. Add:
   - `AIRTABLE_ACCESS_TOKEN`: Your Airtable PAT
   - `AIRTABLE_BASE_ID`: Your Airtable Base ID
3. Redeploy after adding variables

### Issue 3: Function Not Recognized
**Symptom**: 405 error persists after deployment

**Solution**:
1. Verify file structure: `functions/api/subscribe.js`
2. Check function export: `export async function onRequest(context)`
3. Try renaming to `functions/api/subscribe.ts` (if using TypeScript)
4. Check Cloudflare Pages build settings (should be empty/auto-detect)

### Issue 4: CORS Issues
**Symptom**: CORS errors in browser console

**Solution**:
- Function already includes CORS headers
- Verify `Access-Control-Allow-Origin: *` is set
- Check preflight (OPTIONS) requests are handled

## Manual Deployment Test

1. **Test locally with Wrangler**:
```bash
npx wrangler pages dev
```

2. **Check function is accessible**:
```bash
curl -X GET http://localhost:8788/api/subscribe
```

3. **Test POST request**:
```bash
curl -X POST http://localhost:8788/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Verification Steps

1. ✅ Function file exists at `functions/api/subscribe.js`
2. ✅ Function exports `onRequest`
3. ✅ Function is deployed (check Cloudflare dashboard)
4. ✅ Environment variables are set
5. ✅ GET `/api/subscribe` returns health check
6. ✅ POST `/api/subscribe` works with test email

## Still Not Working?

1. Check Cloudflare Pages deployment logs
2. Verify function appears in Functions tab
3. Test with `curl` to see exact error response
4. Check browser network tab for full error details
5. Verify Airtable credentials are correct

