# MDS HMS Backend VPS Deployment

Use this when uploading the backend to `/var/www/hms/backend` through WinSCP and running it with PuTTY.

## 1. Upload Files

Upload the latest backend files from local `backend/` to:

```bash
/var/www/hms/backend
```

Do not upload `node_modules`, `dist`, or local `.env` unless you intentionally want to replace the server file.

## 2. Production Environment

Create or update:

```bash
/var/www/hms/backend/.env
```

Use `backend/.env.production.example` as the template. Important values:

```bash
NODE_ENV=production
PORT=5002
CLIENT_URL="https://www.mdshospital.com.ng,https://mdshospital.com.ng,https://mds01.vercel.app"
UPLOAD_PATH="/var/www/hms/backend/uploads"
ENABLE_SWAGGER=false
ENABLE_QUERY_LOGGING=false
ENABLE_REQUEST_LOGGING=false
```

Keep real database passwords and JWT secrets only on the server.

## 3. Install And Build

Run from the backend folder:

```bash
cd /var/www/hms/backend
npm install
npm run prisma:generate
npm run build
```

## 4. Update Database Safely

This project uses Prisma `upsert` in the seed file, so seeding roles, permissions, trial users, services, templates, and demo records will not wipe existing hospital data.

Run:

```bash
npx prisma db push
npm run prisma:seed
```

If the database already contains real records, do not run `prisma migrate reset`.

## 5. Start Or Restart PM2

The PM2 app name in `backend/ecosystem.config.cjs` is:

```bash
mds-hms-api
```

Start it if it does not exist:

```bash
pm2 start ecosystem.config.cjs --update-env
pm2 save
```

Restart it after updates:

```bash
pm2 restart mds-hms-api --update-env
pm2 save
```

Check logs:

```bash
pm2 logs mds-hms-api --lines 80
```

## 6. Quick Health Checks

Check the API locally on the VPS:

```bash
curl http://127.0.0.1:5002/api/v1/health
```

Check through the public proxy/domain:

```bash
curl https://hms-api.51-178-246-151.sslip.io/api/v1/health
```

Then test login from:

```bash
https://www.mdshospital.com.ng/login
```

## Trial Users

Run `npm run prisma:seed` to refresh these trial accounts:

```text
admin / Admin@123
administrator / Administrator@123
drjohn / Doctor@123
nurseama / Nurse@123
reception / Reception@123
labtech / Lab@12345
pharm / Pharm@123
cashier / Cashier@123
billing / Billing@123
deskoffice / Desk@123
security / Security@123
```

For public production use, remove the trial login cards by setting this Vercel frontend env variable:

```bash
VITE_SHOW_TEST_LOGINS=false
```
