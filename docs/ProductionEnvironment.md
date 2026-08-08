# Production Environment Template

Use these when testing online or deploying the VPS backend and Vercel frontend.

## Backend VPS

Copy `backend/.env.production.example` to the VPS as:

```text
/var/www/hms/backend/.env
```

Then replace:

- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL` if your Vercel domain changes

Keep `CLIENT_URL` as the site origin, for example:

```env
CLIENT_URL="https://mds01.vercel.app"
```

Do not include `/login` in `CLIENT_URL`; CORS checks origins, not page paths.

## Frontend Vercel

Set this in Vercel project environment variables:

```env
VITE_API_URL=https://hms-api.51-178-246-151.sslip.io/api/v1
```

Local development should continue using:

```env
VITE_API_URL=http://localhost:5000/api/v1
```
