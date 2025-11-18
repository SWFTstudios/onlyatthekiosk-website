# Kiosk Form Submission Handler Worker

This Cloudflare Worker handles all form submissions and sends them to Airtable.

## Deployment Instructions

### 1. Install Wrangler CLI (if not already installed)
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Set Environment Variables
Set the environment variables in the Cloudflare Dashboard:
- Go to Workers & Pages > kiosk-form-submission-handler > Settings > Variables
- Add:
  - `AIRTABLE_ACCESS_TOKEN` (Secret): Your Airtable Personal Access Token
  - `AIRTABLE_BASE_ID` (Plaintext): `appA3qQw0NAqz8ru3`

### 4. Deploy the Worker
```bash
cd workers
wrangler deploy
```

### 5. Update Frontend Code
After deployment, update `js/email-signup.js` with the actual Worker URL:
- Replace `YOUR_SUBDOMAIN` with your actual Cloudflare subdomain
- The URL format will be: `https://kiosk-form-submission-handler.YOUR_SUBDOMAIN.workers.dev`

## Worker Endpoint
- **URL**: `https://kiosk-form-submission-handler.YOUR_SUBDOMAIN.workers.dev`
- **Method**: POST
- **Content-Type**: application/json

## Request Body
```json
{
  "email": "user@example.com",
  "formType": "email-signup"
}
```

## Response
Success (200):
```json
{
  "success": true,
  "message": "Email saved successfully",
  "id": "recXXXXXXXXXXXXX"
}
```

Error (400/401/409/500):
```json
{
  "error": "Error message here"
}
```

