# Supabase Setup Guide

## Overview

Supabase is used for CRM functionality (customer data, email subscriptions, lead management).

## Current Setup

### Email Subscriptions
- Email signup form stores emails in Airtable "Incoming Interest" table
- Integration via Cloudflare Pages Function: `/api/subscribe`

## Supabase Tables (Future)

Future CRM tables that can be created in Supabase:

### Customers Table
- Customer profiles
- Contact information
- Preferences

### Email Subscriptions Table
- Newsletter subscriptions
- Marketing preferences
- Unsubscribe tracking

### Leads Table
- Lead management
- Lead scoring
- Conversion tracking

### Interactions Table
- Customer interaction history
- Notes and tags
- Timeline of customer engagement

## Setup Instructions

If you want to set up CRM tables in Supabase, see:
- `docs/supabase/` for Supabase-specific documentation
- `docs/archive/` for reference on table structures

## Connection

- **Project URL**: https://YOUR_SUPABASE_PROJECT_REF.supabase.co
- **API Key**: Set in environment variables or Supabase Dashboard

