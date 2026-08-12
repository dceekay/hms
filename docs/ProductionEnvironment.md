# Production Environment Template

Use this note when updating the VPS backend and Vercel frontend.

Never commit the real VPS `.env`. Keep secrets only on the server or in Vercel environment variables.

## Backend VPS

Production env path:

```text
/var/www/hms/backend/.env
```

Use `backend/.env.production.example` as the safe template, then fill the real values on the VPS.

Required production values:

```env
APP_NAME="CeekayX HMS"
NODE_ENV=production
PORT=5002
API_VERSION=v1

DATABASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/hms"

JWT_SECRET="replace-with-a-long-random-production-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-production-refresh-secret"
ACCESS_TOKEN_EXPIRES=7h
REFRESH_TOKEN_EXPIRES=7d

BCRYPT_SALT_ROUNDS=12

RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

CLIENT_URL="https://www.mdshospital.com.ng,https://mdshospital.com.ng,https://mds01.vercel.app"

LOG_LEVEL=info

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT="mailto:admin@mdshospital.com.ng"

UPLOAD_PATH="/var/www/hms/backend/uploads"
MAX_FILE_SIZE=10485760

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

SOCKET_PORT=5001

SYNC_BATCH_SIZE=100
SYNC_INTERVAL=30000

ENABLE_AUDIT_LOGS=true

DEFAULT_TIMEZONE=Africa/Lagos
DEFAULT_LANGUAGE=en

ENABLE_SWAGGER=false
ENABLE_QUERY_LOGGING=false
ENABLE_REQUEST_LOGGING=false
```

Important:

- `CLIENT_URL` must contain origins only. Do not add `/login` or any path.
- PM2 process name is `mds-hms-api`.
- Nginx should proxy the API domain to `http://127.0.0.1:5002`.
- The real DB password contains special characters and must be URL-encoded inside `DATABASE_URL`.

After editing the VPS env:

```bash
cd /var/www/hms/backend
mkdir -p uploads
npm install
npm run prisma:generate
npx prisma db push
npm run build
pm2 delete mds-hms-api
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs mds-hms-api --lines 80
```

Expected logs:

```text
Environment : production
Port        : 5002
```

## Frontend Vercel

Correct Vercel project:

```text
ceekaysxzone-9787s-projects/hms
```

Project settings:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Production environment variables:

```env
VITE_API_URL=https://hms-api.51-178-246-151.sslip.io/api/v1
VITE_APP_URL=https://www.mdshospital.com.ng
```

When using Vercel CLI with root directory set to `frontend`, run deploy commands from the repository root:

```powershell
cd C:\Users\Venom\Desktop\HMS
vercel deploy --prod
```

## CORS Test

```bash
curl -i -X OPTIONS https://hms-api.51-178-246-151.sslip.io/api/v1/auth/login \
  -H "Origin: https://www.mdshospital.com.ng" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected header:

```text
access-control-allow-origin: https://www.mdshospital.com.ng
```
