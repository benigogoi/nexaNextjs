# NexaDesignLab — Vercel Launch Guide

Status as of launch prep: app builds clean, database intact (15 active products),
storefront verified rendering live. Remaining work is hosting + go-live.

---

## 1. Push the code to GitHub

The launch-prep commit is already made locally on branch `refactor/shared-product-form`.
Get it onto the branch Vercel will deploy (usually `main`):

```bash
# Option A — merge to main (recommended)
git checkout main
git merge refactor/shared-product-form
git push origin main

# Option B — deploy the feature branch as-is
git push origin refactor/shared-product-form
```

> `*.zip` snapshots are now git-ignored and will NOT be pushed.

---

## 2. Import the repo into Vercel

1. vercel.com → **Add New… → Project** → import `benigogoi/nexaNextjs`.
2. Framework preset: **Next.js** (auto-detected).
3. Build command / output: **leave defaults** (`next build`).
4. Node.js version: **20 or 22** (project targets Next 16 / React 19).
5. Do **not** deploy yet — set env vars first (step 3).

---

## 3. Production environment variables

Add these under **Project → Settings → Environment Variables** (scope: Production,
and Preview if you want preview deploys to work). Values come from your local
`.env.local` EXCEPT the Razorpay keys, which must be your **LIVE** keys.

| Variable | Value source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | copy from `.env.local` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | copy from `.env.local` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | copy from `.env.local` | **secret** — server only |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **LIVE** `rzp_live_…` key id | replaces the test key |
| `RAZORPAY_KEY_ID` | **LIVE** `rzp_live_…` key id | replaces the test key |
| `RAZORPAY_KEY_SECRET` | **LIVE** Razorpay secret | **secret** |
| `NIMBUSPOST_EMAIL` | copy from `.env.local` | shipping login |
| `NIMBUSPOST_PASSWORD` | copy from `.env.local` | **secret** |
| `NIMBUSPOST_PICKUP_PINCODE` | copy from `.env.local` | origin pincode |

Optional (skip unless you have them): `NIMBUSPOST_TOKEN` / `NIMBUSPOST_API_KEY`
— a permanent token that bypasses email/password login. Not required.

> Fast path via CLI instead of the dashboard:
> `npm i -g vercel && vercel link && vercel env pull` to compare, or add each with
> `vercel env add <NAME> production`.

---

## 4. Deploy & smoke-test (on the vercel.app URL first)

1. Click **Deploy**. Wait for build to succeed.
2. On the temporary `*.vercel.app` URL, verify:
   - `/` and `/shop` show products with images
   - a product page (`/posters/<slug>`) loads with price + Add to Cart
   - add to cart → checkout → enter a pincode (shipping rate appears)
   - **place a real ₹ test order** and confirm payment + the order shows in `/admin/orders`

---

## 5. Custom domain → go live

1. Vercel → **Settings → Domains** → add `nexadesignlab.com` and `www.nexadesignlab.com`.
2. At your domain registrar, set the DNS records Vercel shows
   (apex `A`/`ALIAS` + `www` `CNAME`). Propagation: minutes to a few hours.
3. The code already points sitemap/robots at `https://nexadesignlab.com`, so once the
   domain is attached, SEO URLs are correct automatically.

---

## 6. Post-launch checklist

- [ ] `/razorpay-test` is a dev test page — consider removing it or it stays publicly reachable.
- [ ] Submit `https://nexadesignlab.com/sitemap.xml` in Google Search Console.
- [ ] Meta Pixel + conversion events (tracked separately — needs Pixel ID).
- [ ] **Supabase free-tier note:** the DB auto-pauses after ~7 idle days and has no
      backups. Real traffic keeps it awake, but during quiet stretches it can sleep.
      Mitigations: upgrade to Pro ($25/mo, no pause + daily backups) OR add a cron that
      pings the site daily (e.g. a Vercel Cron hitting `/shop`) to keep the DB warm.
