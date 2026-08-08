# Local Development Setup

Use this setup when developing on your Windows machine with XAMPP MySQL and Node.js.

## Services

- Backend API: `http://localhost:5000/api/v1`
- Frontend app: `http://localhost:5173`
- MySQL database: `localhost:3306`, database name `hms`

## Environment Files

The local ignored files should be:

Backend: `backend/.env`

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="mysql://root:@localhost:3306/hms"
CLIENT_URL="http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
ACCESS_TOKEN_EXPIRES=7h
REFRESH_TOKEN_EXPIRES=7d
```

Frontend: `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## First Local Run

1. Start XAMPP.
2. Start MySQL from XAMPP Control Panel.
3. Create a database named `hms` in phpMyAdmin.
4. Prepare the backend database:

```bash
cd backend
npm install
npm run prisma:generate
npx prisma db push
npm run prisma:seed
npm run dev
```

5. Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

6. Login with a seeded user:

```text
Doctor: drjohn / Doctor@123
Super Admin: admin / Admin@123
Reception: reception / Reception@123
Lab: labtech / Lab@12345
Pharmacy: pharm / Pharm@123
Security: security / Security@123
```

## Switching Back To Online

For production/VPS work, do not change these local files. Production should keep its own `.env` on the server and Vercel should keep `VITE_API_URL` in the Vercel environment settings.
