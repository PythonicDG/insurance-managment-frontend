# Linux deployment with PM2

The server checkout is `/home/insurance/insurance-managment-frontend`. Use Node.js 24 and the committed
dependency lockfile. PM2 starts the production Next.js server on `127.0.0.1:3000` behind the HTTPS proxy.

## Environment and build

Keep the server's private `.env.local`. NEXT_PUBLIC_API_URL is the backend origin without `/api`.
The value is embedded during compilation; changing it requires a rebuild. The backend must allow
the frontend's exact HTTPS origin. Same-site app/API domains use the backend's Lax, host-only auth cookie.

```sh
cd /home/insurance/insurance-managment-frontend
git pull --ff-only
npm ci
npm audit --audit-level=high
npm run lint
npm run typecheck
npm run build
```

The build downloads Geist fonts from Google Fonts. Keep the backend URL available in the build
environment. Use `npm ci` during deployment so server installations retain the repository lockfile.

## PM2 process

`deploy/ecosystem.config.js` resolves the checkout and installed Next.js CLI automatically.
It defines the `insurance-frontend` process, with file watching disabled and automatic crash restart.

First start:

```sh
pm2 start deploy/ecosystem.config.js
pm2 save
```

After a successful production build:

```sh
pm2 restart deploy/ecosystem.config.js --update-env
pm2 logs insurance-frontend --lines 50
```

On an existing PM2 installation, run `pm2 list` before adopting the configuration. Keep one frontend
process on port 3000; reuse the current process or migrate its name during a maintenance window.
Run PM2 commands as the account that owns the processes. Use `pm2 startup` and its printed command,
then `pm2 save`, to restore processes after a server reboot.

The HTTPS proxy forwards to the loopback port. Verify login, refresh, navigation, reports, uploads,
export verification and logout after restarting.

## Rollback

Retain the previous frontend build and its matching backend commit. Deploy that build, restart the
frontend process and verify the main screens. Rebuild a previous source release if its API origin
differs from the current environment. Check API compatibility before rolling back only one repository.
