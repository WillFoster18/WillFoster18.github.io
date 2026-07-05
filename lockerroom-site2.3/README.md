# LockerRoom

A marketplace prototype for competitive ski racing gear, with a real backend:
user accounts, a real database for listings and racer profiles, an AI Fit
Confidence scoring engine, and Proof Run video uploads.

## Quick status

| Feature | Status |
|---|---|
| Browsing, listing pages, site design | Done |
| Fit Confidence scoring | Done — real rule-based engine, not hardcoded |
| Racer profile | Done — saved to Supabase once configured, else browser-only |
| Sign up / sign in | Done, once Supabase is configured |
| Real listings (persisted, shared across visitors) | Done, once Supabase is configured |
| Proof Run video upload (real, hosted, shared) | Done, once Supabase is configured |
| Payments | Not yet — needs Stripe, see "What's next" |

**Until you configure the backend, the site still works** — it falls back to
local demo data and browser-only storage, exactly like before. Nothing
breaks; you're adding capability, not replacing what worked.

## Setting up the real backend (Supabase)

This takes about 10 minutes and is free.

1. **Create a project** at [supabase.com](https://supabase.com) (free tier).
2. **Run the schema**: open your project's SQL Editor, paste in the entire
   contents of `supabase/schema.sql`, and run it. This creates the
   `profiles`, `listings`, and `proof_runs` tables, locks them down with Row
   Level Security so users can only edit their own data, and creates the
   storage bucket Proof Run videos upload into.
3. **Get your API keys**: in your Supabase project, go to
   **Project Settings → API**. Copy the **Project URL** and the
   **anon / public key**.
4. **Paste them into `js/config.js`**, replacing the placeholder values.
5. **Check your email settings**: by default Supabase requires email
   confirmation before sign-in works. For testing, you can turn this off in
   **Authentication → Providers → Email → Confirm email** (toggle off), or
   just check the confirmation email when testing sign-up.

That's it — reload the site and you'll have real accounts, real listings,
and real video uploads shared across anyone who visits.

### A note on security (read this once, it matters)

The two values in `js/config.js` (project URL and anon key) are **safe to
commit to GitHub** — Supabase designs the anon key to be public; your data
is protected by the Row Level Security policies in `schema.sql`, not by
secrecy.

**Never put these anywhere in this repo, including `config.js`:**
- Your Supabase **service_role** key (bypasses all security rules)
- Any Stripe **secret** key (starts with `sk_`)

Those need a real server to hold them (see "What's next" below). Don't paste
them into a chat with anyone, including an AI assistant — treat them like a
password.

## Project structure

```
lockerroom-site/
├── index.html               All pages (single-page app, view switching in JS)
├── css/
│   └── styles.css
├── js/
│   ├── config.js             Your Supabase project URL + anon key go here
│   ├── backend.js            All Supabase calls — auth, listings, profiles, storage
│   ├── fit-confidence.js     The Fit Confidence scoring engine
│   └── app.js                Rendering, view switching, form handling
├── supabase/
│   └── schema.sql            Database tables + security policies — run this once
└── assets/
    └── (logo files)
```

## Running it locally

No build step. Either open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## Pushing to GitHub

```bash
cd lockerroom-site
git init
git add .
git commit -m "Add real backend: auth, database, Proof Run storage"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/lockerroom.git
git push -u origin main
```

## Deploying

**GitHub Pages** still works for this — it's a static site even with
Supabase wired in, since Supabase is called directly from the browser:

1. Push to GitHub (above).
2. Repo → **Settings → Pages** → Source: "Deploy from a branch" → `main` → `/ (root)`.
3. You'll get a live URL in a minute or two.

## What's next: payments

Buying and selling money needs a Stripe **secret** key, which can't live in
this static site — it has to sit on a server. The cleanest path from here:

1. Move hosting to **Vercel** instead of GitHub Pages (still connects to the
   same GitHub repo, still free) — Vercel adds the ability to run small
   server-side functions.
2. Add one serverless function (`/api/create-checkout-session`) that holds
   the Stripe secret key as a Vercel environment variable (never in this
   repo) and creates a Stripe Checkout session when someone clicks "Buy Now."
3. Everything else — listings, accounts, Fit Confidence, Proof Runs — stays
   exactly as it is now.

Happy to build that function when you're ready for it.

