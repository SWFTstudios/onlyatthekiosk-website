# Email Signup Integration

## Overview

Email signup functionality for the Only at The Kiosk website. Users can subscribe to receive notifications when the store launches.

## How It Works

### Frontend (`js/email-signup.js`)
- Displays email signup modal
- Validates email format
- Submits email to API endpoint
- Shows success/error messages

### Backend (`functions/api/subscribe.js`)
- Cloudflare Pages Function
- Validates email address
- Stores email in Airtable "Incoming Interest" table
- Returns success/error response

### Storage (Airtable)
- **Table**: "Incoming Interest"
- **Fields**: 
  - Email Address
  - Date Submitted
  - Source (optional)
- **Base ID**: `appA3qQw0NAqz8ru3`

## API Endpoint

**URL**: `/api/subscribe`  
**Method**: POST  
**Content-Type**: application/json

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Email subscribed successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid email address"
}
```

## Setup

### Environment Variables (Cloudflare Pages)
- `AIRTABLE_ACCESS_TOKEN`: Your Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Your Airtable Base ID

### Airtable Table Setup
1. Create table: "Incoming Interest"
2. Add field: "Email Address" (Email type)
3. Add field: "Date Submitted" (Created time, auto-populated)
4. Add field: "Source" (Single line text, optional)

## Testing

1. Open website in browser
2. Click "NOTIFY ME" button
3. Enter email address
4. Submit form
5. Verify email appears in Airtable table

## Status

✅ **Working**: Email signup is fully functional and deployed

