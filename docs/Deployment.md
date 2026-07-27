# HMS Deployment Guide

This setup runs only the HMS backend on the VPS and runs the React frontend on Vercel.

## Target Architecture

- VPS: MySQL, phpMyAdmin, PM2, Nginx reverse proxy, HMS backend.
- Vercel: HMS frontend build.
- Browser flow: `https://your-hms.vercel.app` calls `https://api.your-domain.com/api/v1`.

Use a subdomain for the API if possible, for example:

```text
api.mds-hospital.com -> VPS public IP
mds-hospital.com or Vercel URL -> Vercel frontend
```

## Backend Preparation

The backend is ready for PM2 through:

```text
backend/ecosystem.config.cjs
```

The production CORS allow-list is controlled by:

```text
CLIENT_URL=https://your-hospital-frontend.vercel.app
```

For multiple frontend domains, separate them with commas:

```text
CLIENT_URL=https://your-hospital-frontend.vercel.app,https://staff.mds-hospital.com
```

## VPS Backend Deployment

SSH into the server:

```bash
ssh root@YOUR_SERVER_IP
cd /var/www
```

Clone the HMS repo beside the existing apps:

```bash
git clone https://github.com/dceekay/hms.git hms
cd /var/www/hms/backend
```

Install dependencies:

```bash
npm ci
```

Create production env:

```bash
cp .env.example .env
nano .env
```

Set these values carefully:

```env
NODE_ENV=production
PORT=5002
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@localhost:3306/hms"
JWT_SECRET="long-random-production-secret-at-least-32-characters"
JWT_REFRESH_SECRET="another-long-random-production-secret-at-least-32-characters"
ACCESS_TOKEN_EXPIRES=7h
REFRESH_TOKEN_EXPIRES=7d
CLIENT_URL="https://your-hospital-frontend.vercel.app"
ENABLE_QUERY_LOGGING=false
ENABLE_REQUEST_LOGGING=false
ENABLE_SWAGGER=false
```

Use a port that does not conflict with your existing PM2 backend. The example uses `5002`.

Generate Prisma client and build:

```bash
npm run prisma:generate
npm run build
```

Apply the database schema. If this is the first production setup and you are not using migrations yet:

```bash
npx prisma db push
```

Seed initial roles/users only when you want demo/admin accounts created:

```bash
npm run prisma:seed
```

Start with PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

Check locally on the VPS:

```bash
curl http://localhost:5002/api/v1/health
```

## Nginx Reverse Proxy

Create an Nginx server block for the API:

```nginx
server {
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload:

```bash
nginx -t
systemctl reload nginx
```

Add SSL:

```bash
certbot --nginx -d api.your-domain.com
```

Then test:

```bash
curl https://api.your-domain.com/api/v1/health
```

## Vercel Frontend Deployment

In Vercel:

1. Import the GitHub repo.
2. Set the project root to `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variable:

```env
VITE_API_URL=https://api.your-domain.com/api/v1
```

Deploy. After Vercel gives you the live URL, update the VPS backend `.env`:

```env
CLIENT_URL=https://your-real-vercel-url.vercel.app
```

Restart the backend:

```bash
cd /var/www/hms/backend
pm2 restart mds-hms-api --update-env
```

## Update Process

For backend updates:

```bash
cd /var/www/hms
git pull origin main
cd backend
npm ci
npm run prisma:generate
npm run build
pm2 restart mds-hms-api --update-env
```

Run schema changes when needed:

```bash
npx prisma db push
```

For frontend updates:

```text
Push to GitHub. Vercel rebuilds automatically.
```

## Checklist

- API health works on the VPS local port.
- API health works through HTTPS domain.
- Vercel has `VITE_API_URL` pointing to the HTTPS API URL.
- Backend `.env` has `CLIENT_URL` set to the Vercel frontend URL.
- MySQL database exists and matches `DATABASE_URL`.
- PM2 shows `mds-hms-api` online.
- Existing apps in `/var/www/api`, `/var/www/html`, and other folders are not touched.
