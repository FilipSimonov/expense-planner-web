# Expense Planner (Web)

A multi-user version of the budget planner: log income and expenses by
category, close months into savings, track outside savings/investments, and
a budget donut chart — all accessible from any browser, on any device, with
your own account. Built with React (Vite) and Supabase (Postgres + Auth).

## How it works

- **Supabase** hosts the database and handles login/signup. Every table has
  a `user_id` column and a Row Level Security policy that only lets a user
  see their own rows — enforced by the database itself.
- **Vercel** (or any static host) serves the React app. It's just a website:
  open the URL on your phone, laptop, tablet — log in, see your data.
- There's no server to run or maintain yourself.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), sign up (free), and create a
   new project. Pick any name/region; save the database password it gives
   you somewhere safe (you likely won't need it directly).
2. Once the project is ready, open **SQL Editor** in the left sidebar, paste
   in the entire contents of `supabase/schema.sql` from this project, and
   run it. This creates all the tables and security policies.
3. Go to **Project Settings -> API**. You'll need two values from here in
   the next step: the **Project URL** and the **anon public** key.
4. By default Supabase requires email confirmation for new signups. For your
   own personal testing, you can turn this off under **Authentication ->
   Providers -> Email -> "Confirm email"** (toggle off) so you can log in
   immediately after signing up. Turn it back on if this becomes a
   multi-user app you're sharing with others.

## 2. Configure the app

In this project folder:

```
cp .env.example .env
```

Open `.env` and paste in your Project URL and anon key from step 1.3.

## 3. Run it locally

```
npm install
npm run dev
```

Open the local URL it prints (usually `http://localhost:5173`). Sign up for
an account, and you're in.

## 4. Deploy so you can access it from any device

The easiest path is **Vercel**:

1. This project is already a git repo with an initial commit made (you'll
   see a `.git` folder). Create an empty repository on GitHub — go to
   [github.com/new](https://github.com/new), name it e.g.
   `expense-planner-web`, leave "Add a README" **unchecked** (this project
   already has one), and click **Create repository**. Don't skip this —
   you need the empty repo to exist on GitHub before the next step.
2. GitHub will show you a page with a remote URL. Back in this project
   folder, run:
   ```
   git remote add origin https://github.com/YOUR-USERNAME/expense-planner-web.git
   git push -u origin main
   ```
   (swap in the URL GitHub actually gave you — it'll match this pattern).
   It'll prompt you to log into GitHub the first time.
3. Go to [vercel.com](https://vercel.com), sign up with your GitHub account,
   and click **Add New -> Project**, then pick this repository.
4. Vercel auto-detects it's a Vite app — you don't need to change any build
   settings.
5. Before deploying, add your two environment variables (**Settings ->
   Environment Variables**): `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`, same values as your `.env` file.
6. Click **Deploy**. In about a minute you'll get a URL like
   `expense-planner.vercel.app` — that's it, live and reachable from any
   device's browser.

From here, log in with the same account on your phone, laptop, whatever —
all pointing at the same Supabase database, so everything stays in sync.

## 5. Optional: make it feel like an installed app

On a phone, open the deployed URL in the browser and use "Add to Home
Screen" (Safari/Chrome share menu) — it'll get an icon and open full-screen
like a normal app, no separate build step needed.

## 6. Multiple users

Signups are open by default — anyone with the URL can create an account,
and each account only ever sees its own data (enforced by the database
policies in `supabase/schema.sql`). If you want to restrict who can sign up,
that's a Supabase Auth setting (e.g. disabling public signups and inviting
people manually) — let me know if you want that locked down instead of open.

## 7. Email confirmation & password reset redirect pages

New signups land on `/welcome` (a "you're confirmed" screen), and password
resets land on `/reset-password` (a "set a new password" screen), instead of
dropping straight into the app. This needs one setting on Supabase's side:

1. In your Supabase project, go to **Authentication -> URL Configuration**.
2. Under **Redirect URLs**, add both:
   - `https://expense-planner-web-app.vercel.app/welcome`
   - `https://expense-planner-web-app.vercel.app/reset-password`
   (Supabase silently ignores `emailRedirectTo` unless the exact URL is
   allow-listed here — this step is required, not optional.)
3. If you use a different or additional deployed URL later, add both paths
   for that URL too.

`vercel.json` in this project makes sure Vercel serves the app correctly for
those paths (without it, visiting any path other than `/` directly would
404 on a static host).

Forgot password is available from the login screen ("Forgot password?"),
and works the same way: request a link, click it, land on
`/reset-password`, set a new password.

## 8. Currency conversion

Amounts are entered and stored as plain numbers in a single home currency
(`$`, i.e. USD) — the currency picker doesn't change what's stored, it
converts for display only, using live exchange rates fetched from a free
public API and cached for an hour. If a rate ever fails to load, amounts
fall back to showing unconverted with a small `*` next to the currency, and
a note appears on the Ledger tab.

## Project layout

```
vercel.json              SPA rewrite rule (needed for /welcome, /reset-password)
supabase/schema.sql     Run once in Supabase's SQL Editor
src/
  supabaseClient.js       Supabase connection (reads .env)
  db.js                   All data queries (mirrors the mobile app's logic)
  currency.js              Currency symbols + live exchange-rate fetching
  useCurrency.js            Shared hook: selected currency + converting fmt()
  context/AuthContext.jsx  Tracks the logged-in user
  screens/
    AuthScreen.jsx          Login / signup / forgot password
    WelcomeScreen.jsx        Shown after confirming email (/welcome)
    ResetPasswordScreen.jsx   Shown after clicking a reset link (/reset-password)
    LedgerScreen.jsx        Current month
    HistoryScreen.jsx       Past months, editable, reopen most recent
    SavingsScreen.jsx       Manually tracked savings/investment accounts
  components/
    StatCard.jsx, DonutRing.jsx, BudgetDonut.jsx
```
