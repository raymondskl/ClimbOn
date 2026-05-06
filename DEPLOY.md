# Deploying ClimbOn to Vercel + Turso

## 1. Create the Turso database

```bash
# install once
brew install tursodatabase/tap/turso
turso auth signup   # or: turso auth login

# create the DB (pick any region close to your Vercel deployment region)
turso db create climbon --location syd

# get the URL + an auth token
turso db show climbon --url
turso db tokens create climbon
```

Save both values — you need them in Vercel.

## 2. Seed the schema + demo data

From the project root, with the values from above exported:

```bash
TURSO_DATABASE_URL="libsql://climbon-<your-org>.turso.io" \
TURSO_AUTH_TOKEN="<token>" \
node scripts/init-db.mjs
```

The script is idempotent — it creates tables with `IF NOT EXISTS` and only seeds
demo rows when the `projects` table is empty. Re-run it any time to re-apply
schema changes.

## 3. Push to GitHub

```bash
git add -A
git commit -m "Migrate to libSQL"
git push
```

## 4. Connect Vercel

1. Go to <https://vercel.com/new> and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). No build-command tweaks.
3. Under **Environment Variables**, add:
   - `TURSO_DATABASE_URL` = the `libsql://...turso.io` URL from step 1
   - `TURSO_AUTH_TOKEN` = the token from step 1
4. Click **Deploy**.

That's it — Vercel runs `next build`, ClimbOn talks to Turso over HTTPS.

## How dev vs prod work

`lib/db.ts` reads `TURSO_DATABASE_URL`. If it's unset (local dev), it falls
back to `file:./data/climbon.db` — the `@libsql/client` package speaks both
the remote HTTP protocol and a local SQLite file with the same API. So:

| Environment | URL | Auth | Storage |
| --- | --- | --- | --- |
| `npm run dev` | `file:./data/climbon.db` | none | local file |
| Vercel preview/prod | `libsql://...turso.io` | token | Turso |

You can also point dev at Turso by setting `TURSO_DATABASE_URL` in
`.env.local`. The schema is created on first connection in either mode (every
repo call awaits a one-shot `ensureSchema` promise, idempotent thanks to
`CREATE TABLE IF NOT EXISTS`).

## Notes / gotchas

- **No persistent local file on Vercel.** Don't put a SQLite file in the repo
  — the serverless filesystem is read-only and ephemeral. Turso is the source
  of truth in production.
- **Auth.** The app currently has no login layer. Anyone with the URL can
  edit everything. Add a middleware password gate or wire up Vercel password
  protection (Project Settings → Deployment Protection) before sharing the
  URL externally.
- **Cold starts.** First request to a fresh Vercel function pays the cost of
  the libSQL handshake + schema check (~tens of ms). Subsequent requests
  reuse the cached client.
- **Backups.** From your laptop:
  ```bash
  turso db shell climbon ".dump" > backup-$(date +%F).sql
  ```
  Drop that into a cron / scheduled action for automated nightly dumps.
- **Schema migrations.** New `CREATE TABLE` statements added to `lib/db.ts`
  apply automatically on next request (they're `IF NOT EXISTS`). Anything
  that needs `ALTER TABLE` should go in a one-off script you run with
  `TURSO_*` set, the same way `scripts/init-db.mjs` runs.
