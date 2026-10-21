# Email signup

Every email form on the site goes through `POST /api/subscribe` (`functions/api/subscribe.js`). Signups are stored in D1 and Airtable, and confirmation and team emails are sent through Cloudflare Email Service.

The full description (forms, storage, emails and setup) is in [ACCOUNTS.md → Email forms](ACCOUNTS.md#email-forms).

`js/email-signup.js` is the old launch-modal script. No page loads it any more.
