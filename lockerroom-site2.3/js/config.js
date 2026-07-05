/*
  LockerRoom configuration
  -------------------------
  Fill in the two values below after creating your Supabase project
  (Project Settings -> API in the Supabase dashboard).

  IS THIS SAFE TO COMMIT TO GITHUB? Yes, for these two values specifically.
  The Supabase "anon" key is designed to be public — it's meant to ship in
  frontend code. Your actual data is protected by the Row Level Security
  policies in supabase/schema.sql, not by keeping this key secret.

  Do NOT put these here, ever, even later:
  - Your Supabase "service_role" key (full database access, bypasses RLS)
  - Any Stripe secret key (starts with sk_)
  Those belong only in a server environment (e.g. Vercel environment
  variables for a serverless function), never in a file that ships to
  the browser.
*/

window.LOCKERROOM_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',        // e.g. https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
};
