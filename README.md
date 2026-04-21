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
