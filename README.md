# BankShakha Backend

Production-style backend with Node.js, Express, MongoDB and a plain HTML/CSS/JS admin panel.

## Features
- JWT admin authentication
- MongoDB models for categories, products, customers, earnings, notifications, users
- Public app APIs for mobile app
- Protected admin CRUD APIs
- Admin APIs for categories, products, customers, earnings, notifications and success stories
- Seed data + default admin user
- Static admin panel served from backend

## Setup
1. `cd backend`
2. Create `.env` from `.env.example`
3. Update `.env` values
4. `npm install`
5. `npm run dev`

## Default Admin
- Email: from `ADMIN_EMAIL` in `.env`
- Password: from `ADMIN_PASSWORD` in `.env`

## API Base
- API: `http://localhost:5000/api`
- Admin: `http://localhost:5000/admin`

## Production Deploy (Separated Backend)
Use this backend as an independent service (Render/Railway/VPS/Docker).

1. Deploy only the `backend` folder.
2. Use `.env.production.example` values as reference.
3. Set required env vars in hosting panel:
- `NODE_ENV=production`
- `MONGODB_URI=<your prod mongo uri>`
- `JWT_SECRET=<strong secret>`
- `AUTO_SEED=false`
- `PUBLIC_BASE_URL=https://api.yourdomain.com`
- `ALLOWED_ORIGINS=https://admin.yourdomain.com,https://your-frontend-domain.com`
4. Start command: `npm start`
5. Health check: `GET /api/health`

## Deploy On Vercel
This folder is ready for Vercel serverless deployment.

1. Push repository to GitHub.
2. In Vercel, create a new project from this repo.
3. Set **Root Directory** to `backend`.
4. Framework preset: `Other`.
5. Build command: leave empty (or `npm install`).
6. Output directory: leave empty.
7. Set environment variables in Vercel Project Settings:
- `NODE_ENV=production`
- `MONGODB_URI=<your atlas uri>`
- `JWT_SECRET=<very-long-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `AUTO_SEED=false`
- `ADMIN_EMAIL=admin@bankshakha.com`
- `ADMIN_PASSWORD=<strong-admin-password>`
- `ALLOWED_ORIGINS=https://your-frontend-domain.com`
- `TRUST_PROXY=true`
- `PUBLIC_BASE_URL=https://<your-vercel-domain>`
8. Deploy.
9. Verify:
- `GET https://<your-vercel-domain>/api/health`
- `POST https://<your-vercel-domain>/api/auth/login`
- `GET https://<your-vercel-domain>/admin`

Notes:
- `vercel.json` routes all requests to the serverless Express handler.
- `public/admin` is bundled in the function for `/admin`.

## Docker
From `backend` directory:
1. `docker build -t bankshakha-backend .`
2. `docker run -p 5000:5000 --env-file .env bankshakha-backend`

## Connect Mobile App To Live Backend
In app build env, set:
- `EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api`

Without this env var, production app requests are blocked by design.

## Important Endpoints
- `POST /api/auth/login`
- `POST /api/auth/user/send-otp`
- `POST /api/auth/user/verify-otp`
- `GET /api/auth/me`
- `GET /api/app/home`
- `GET /api/app/products?categoryId=credit-card&limit=20`
- `GET /api/app/customers?search=ravi&limit=50`
- `GET /api/admin/dashboard` (auth required)
- `GET /api/admin/management-data` (auth required)
