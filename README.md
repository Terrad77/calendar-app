# calendar-app

Calendar app with `Vite + React + TypeScript` (frontend) and `Node.js + TypeScript` (backend).

## Структура проекта

- `frontend` - клиентское приложение (Vite)
- `backend` - API-сервер (Express)
- `package.json` в корне - общие скрипты для удобного запуска

## Быстрый старт

Установите зависимости во всех частях проекта:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

## Запуск проекта

### Запуск обоих сервисов одной командой (рекомендуется)

Из корня проекта:

```bash
npm run dev:all
```

Эта команда запускает:

- frontend (`vite`)
- backend (`nodemon` + TypeScript hot-reload)

### Раздельный запуск (если нужно)

```bash
npm run dev:frontend
npm run dev:backend
```

## Порты

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`

Если порт занят, frontend может автоматически перейти на следующий (`5174`, `5175` и т.д.).

## Если порты заняты

Освободить порты и перезапустить оба сервиса:

```bash
kill -9 $(lsof -ti :3001) 2>/dev/null
kill -9 $(lsof -ti :5173) 2>/dev/null
kill -9 $(lsof -ti :5174) 2>/dev/null
npm run dev:all
```

## Полезные команды

```bash
# Сборка frontend
npm run build --prefix frontend

# Сборка backend
npm run build --prefix backend

# Запуск backend из production-сборки
npm run start --prefix backend
```

## Настройка Google OAuth (локально и для продакшн)

1. В Google Cloud Console создайте OAuth 2.0 Client ID (Тип: Web application).
2. В разделе Authorized redirect URIs добавьте адрес:
   - Для локальной разработки: `http://localhost:3001/api/auth/google/callback`
   - Для продакшна: `https://<your-domain>/api/auth/google/callback`
3. Скопируйте `Client ID` и `Client Secret` и добавьте их в файл `backend/.env` или в секреты окружения в хостинге:

```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

- Перезапустите backend: `npm run dev --prefix backend` или `npm run start --prefix backend`.
- Проверка: откройте `http://localhost:3001/api/auth/google` — сервер должен вернуть 302 редирект на accounts.google.com.

## Хранение и управление секретами

- Никогда не коммитьте реальные секреты в репозиторий. В корне репо есть `.env.example` — используйте его как шаблон.
- Для локальной разработки храните секреты в `backend/.env` (этот файл должен быть в `.gitignore`).
- Для CI/CD и продакшена используйте безопасные хранилища секретов:
  - GitHub Actions Secrets / GitLab CI Variables
  - Vercel / Netlify environment variables
  - AWS Secrets Manager / Parameter Store, Azure Key Vault, Google Secret Manager
  - Docker secrets / Kubernetes secrets
- При деплое убедитесь, что все обязательные переменные окружения установлены: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_AI_API_KEY` и т.д.

Если нужно, могу добавить пример workflow для GitHub Actions с использованием секретов — скажите, где вы деплоите.
