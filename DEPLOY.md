# BeepCred deploy

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
  /opt/bitnami/apache/conf/vhosts/beepcred.conf
# Ensure this file is included before project-subdomains.conf so exact ServerName wins.
sudo /opt/bitnami/apache/bin/httpd -t
sudo /opt/bitnami/ctlscript.sh restart apache
```

Requires `proxy` / `proxy_http` modules.

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

## CI

Push to `main` runs **Deploy BeepCred** (rsync → install → build → PM2 reload).
