# Only At The Kiosk Website

Website for "Only At The Kiosk" brand and online store.

## Features

- Google Analytics integration for web traffic monitoring
- Email signup modal for launch notifications
- Airtable integration for email collection

## Setup

### Environment Variables

For the Cloudflare Pages Function to work, you need to set the following environment variables in your Cloudflare Pages dashboard:

- `AIRTABLE_ACCESS_TOKEN`: Your Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Your Airtable Base ID

### Setting Environment Variables in Cloudflare Pages

1. Go to your Cloudflare Pages project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:
   - `AIRTABLE_ACCESS_TOKEN`: Your Airtable Personal Access Token
   - `AIRTABLE_BASE_ID`: Your Airtable Base ID (e.g., `appA3qQw0NAqz8ru3`)

### Airtable Table Structure

The function expects an Airtable table named "Incoming Interest" with the following fields:
- `Email` (Email field)
- `Date` (Date field) - optional, will be auto-populated

## Deployment

This project is configured for Cloudflare Pages deployment. The `functions/api/subscribe.js` file will automatically be deployed as a serverless function at `/api/subscribe`.

### Important: Build Command Configuration

**For Cloudflare Pages, you should NOT have a build command set.** Cloudflare Pages automatically detects and deploys:
- Static files (HTML, CSS, JS, images, etc.)
- Pages Functions (from the `functions/` directory)

**To fix deployment errors (like `wrangler deploy` errors):**

1. Go to your Cloudflare Pages project dashboard: https://dash.cloudflare.com
2. Navigate to your project: **Workers & Pages > onlyatthekiosk-website**
3. Go to **Settings > Builds & deployments**
4. Under **Build configuration**:
   - **Build command**: Leave this **empty** (or use `./build.sh` if you need a command)
   - **Output directory**: Leave this **empty** (or set to `/`)
5. Save and trigger a new deployment

**Note:** The `wrangler deploy` command is for deploying Workers, not Pages. If you see this error, it means a Worker build command was incorrectly set in your Pages project settings. The `workers/` directory in this repo is for a separate Worker deployment, not for Pages.

## Development

Simply open `index.html` in a browser for local development. Note that the email signup functionality requires the Cloudflare Pages Function to be deployed.

