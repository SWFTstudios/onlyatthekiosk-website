-- Setup Scheduled Sync - Run Every 5 Minutes
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule sync job (runs every 5 minutes)
SELECT cron.schedule(
  'sync-airtable-products',  -- Job name
  '*/5 * * * *',             -- Every 5 minutes (cron syntax: minute hour day month weekday)
  $$
  SELECT
    net.http_post(
      url := 'https://aszjrkqvkewoykteczxf.supabase.co/functions/v1/super-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzempya3F2a2V3b3lrdGVjenhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5OTEsImV4cCI6MjA3OTIwODk5MX0.7KnXY1W2t6WwBilIJwJA6lfVqU913SJK6NmSCk6yfUk'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Step 3: Verify the job was created
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'sync-airtable-products';

-- Step 4: Check job runs (after first run)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-airtable-products')
ORDER BY start_time DESC
LIMIT 10;

-- ============================================
-- Useful Commands
-- ============================================

-- View all scheduled jobs
SELECT * FROM cron.job;

-- Update schedule to run every 10 minutes instead
-- SELECT cron.unschedule('sync-airtable-products');
-- SELECT cron.schedule(
--   'sync-airtable-products',
--   '*/10 * * * *',
--   $$...same command...$$
-- );

-- Remove scheduled job
-- SELECT cron.unschedule('sync-airtable-products');

-- Common Cron Schedules:
-- '*/5 * * * *'   - Every 5 minutes
-- '*/15 * * * *'  - Every 15 minutes
-- '0 * * * *'     - Every hour
-- '0 */6 * * *'   - Every 6 hours
-- '0 0 * * *'     - Daily at midnight

