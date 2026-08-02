# BeepCred deploy

Repo: **https://github.com/drobles-bcg/beepcred**

Production host: **beepcred.danieljrobles.com** → Apache reverse-proxy → PM2 `beepcred` on `127.0.0.1:3010`.

## Server path

```
/opt/bitnami/apps/beepcred
```

## Environment (`/opt/bitnami/apps/beepcred/.env`)

```
NODE_ENV=production
PORT=3010
SESSION_SECRET=<strong secret>
CLIENT_ORIGIN=https://beepcred.danieljrobles.com
```

Optional: `OPENAI_API_KEY` for plate photo insights.

Do not commit `.env`. Create it once on the box; deploy rsync excludes it.

## Apache

Install the dedicated vhost from the portfolio repo:

```bash
sudo cp /opt/bitnami/apache/htdocs/infra/apache/beepcred.conf \
  /opt/bitnami/apache/conf/vhosts/00-beepcred.conf
sudo /opt/bitnami/apache/bin/httpd -t
sudo /opt/bitnami/ctlscript.sh restart apache
```

Requires `proxy` / `proxy_http` modules.

**Do not** leave a global `ProxyPass /api/` in `httpd.conf` pointing at the main site backend — it steals BeepCred’s `/api`. Keep `/api` proxy only on `danieljrobles.conf`.

## PM2

```bash
cd /opt/bitnami/apps/beepcred
pm2 startOrReload ecosystem.config.cjs
pm2 save
```

Health: `curl -s http://127.0.0.1:3010/api/health`

## First-time database

Only when `server/db/database.sqlite` is missing:

```bash
npm run db:migrate
npm run db:seed
```

Seed users: `admin` / `mod` / `user` (password = username).

## Google Sign-In

1. Google Cloud Console → APIs & Services → Credentials → Create **OAuth client ID** (Web application).
2. Authorized JavaScript origins:
   - `https://beepcred.danieljrobles.com`
   - `http://localhost:5180` (local Vite)
3. On the server, set in `/opt/bitnami/apps/beepcred/.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

4. Redeploy / `pm2 restart beepcred`. The Sign in with Google button appears when this is set.
