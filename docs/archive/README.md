# Archived Documentation

This directory contains archived documentation and scripts related to product sync functionality that is not currently in use.

## What's Here

- **Product Sync Documentation**: Setup guides for Airtable → Supabase and Shopify → Supabase product syncing
- **SQL Scripts**: Database migration and setup scripts for product tables
- **Edge Functions**: Product sync functions (archived in `supabase/functions/archive/`)

## Current Architecture

Products, inventory, and orders are handled in **Shopify**.

Supabase handles **CRM** (customers, email subscriptions, leads).

## Why Archived

These files were created during initial planning for product sync functionality. The decision was made to keep products in Shopify instead, so these files are archived for potential future reference.

## If You Need These Later

If you want to sync products to Supabase in the future:
- See `COMPLETE_SYNC_SETUP.md` for Airtable → Supabase sync
- See `SHOPIFY_SYNC_SETUP.md` for Shopify → Supabase sync
- Edge functions are in `supabase/functions/archive/`
