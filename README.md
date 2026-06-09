# calendar-app

[![Vercel](https://img.shields.io/badge/Vercel-Live-000000?logo=vercel&logoColor=white)](https://calendar-app-pi-gold.vercel.app) [![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://calendar-app-i6oa.onrender.com) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)

CalendAir is a full-stack web calendar application with AI-powered insights, real-time notifications, calendar sharing, contacts management, and analytics. Built as a bachelor's thesis project at KhAI (Kharkiv Aviation Institute).

## Live Demo

- **Production URL:** [https://calendar-app-pi-gold.vercel.app](https://calendar-app-pi-gold.vercel.app)
- **Demo credentials:** email `dt@gmail.com` / password `Td12345678`

## Tech Stack

| Frontend      | Backend           |
| ------------- | ----------------- |
| React 19      | Node.js           |
| TypeScript    | Express           |
| Vite          | TypeScript        |
| Redux Toolkit | Drizzle ORM       |
| TailwindCSS   | PostgreSQL (Neon) |

**Infra:** Vercel (frontend), Render (backend), GitHub Actions (CI/CD)

## Features

- AI-powered calendar insights (Google Gemini 2.5 Flash)
- Weather-aware AI chat
- Real-time notifications
- Calendar sharing with privacy controls
- Contacts management with CSV export
- Analytics with charts (MonthPulseChart)
- Multi-language support (EN/UK)
- Google OAuth + JWT auth

## Project Structure

- `frontend` - клієнтський застосунок (Vite)
- `backend` - API-сервер (Express)
- `package.json` у корені - спільні скрипти для зручного запуску

## Quick Start

Встановіть залежності в усіх частинах проєкту:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

## Running the Project

### Run Both Services with One Command (Recommended)

З кореня проєкту:

```bash
npm run dev:all
```

Ця команда запускає:

- frontend (`vite`)
- backend (`nodemon` + TypeScript hot-reload)

### Run Separately (If Needed)

```bash
npm run dev:frontend
npm run dev:backend
```

## Ports

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`

Якщо порт зайнятий, frontend може автоматично перейти на наступний (`5174`, `5175` тощо).

## If Ports Are Busy

Звільнити порти та перезапустити обидва сервіси:

```bash
kill -9 $(lsof -ti :3001) 2>/dev/null
kill -9 $(lsof -ti :5173) 2>/dev/null
kill -9 $(lsof -ti :5174) 2>/dev/null
npm run dev:all
```

## Useful Commands

```bash
# Build frontend
npm run build --prefix frontend

# Build backend
npm run build --prefix backend

# Apply DB migrations
npm run db:migrate --prefix backend

# Start backend from production build
npm run start --prefix backend
```

## Render Deployment

Для Render краще запускати міграції до старту сервера, наприклад через Build Command:

```bash
npm run db:migrate --prefix backend && npm run build
```

Якщо сервіс деплоїться лише з `backend`, можна використати:

```bash
npm run db:migrate && npm run build
```

Якщо Render запускає застосунок раніше за міграції, винесіть `npm run db:migrate` на початок start command через `&&`:

```bash
npm run db:migrate && node dist/server.js
```

## Google OAuth Setup (Local and Production)

1. У Google Cloud Console створіть OAuth 2.0 Client ID (Тип: Web application).
2. У розділі Authorized redirect URIs додайте адресу:
   - Для локальної розробки: `http://localhost:3001/api/auth/google/callback`
   - Для продакшну: `https://<your-domain>/api/auth/google/callback`
3. Скопіюйте `Client ID` і `Client Secret` та додайте їх у файл `backend/.env` або в секрети середовища на хостингу:

```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

- Перезапустіть backend: `npm run dev --prefix backend` або `npm run start --prefix backend`.
- Перевірка: відкрийте `http://localhost:3001/api/auth/google` — сервер має повернути 302 редирект на accounts.google.com.

## Secrets Storage and Management

- Ніколи не комітьте справжні секрети в репозиторій. У корені репозиторію є `.env.example` — використовуйте його як шаблон.
- Для локальної розробки зберігайте секрети в `backend/.env` (цей файл має бути в `.gitignore`).
- Для CI/CD та продакшну використовуйте безпечні сховища секретів:
  - GitHub Actions Secrets / GitLab CI Variables
  - Vercel / Netlify environment variables
  - AWS Secrets Manager / Parameter Store, Azure Key Vault, Google Secret Manager
  - Docker secrets / Kubernetes secrets
- Під час деплою переконайтеся, що всі обовʼязкові змінні середовища встановлені: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_AI_API_KEY` тощо.

## Author

- GitHub: [Terrad77](https://github.com/Terrad77)
