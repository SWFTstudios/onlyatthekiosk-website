-- Drop alerts can ask for one size and / or one colour of a piece.
-- `interest` stays the product id with the choice appended (tee-004-orbit,
-- tee-004-orbit@xl, tee-004-orbit@xl/yellow-cab), so each combination is its
-- own row; size and colour hold the choice as shown ('' = any). Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

ALTER TABLE subscribers ADD COLUMN size TEXT NOT NULL DEFAULT '';
ALTER TABLE subscribers ADD COLUMN colour TEXT NOT NULL DEFAULT '';
