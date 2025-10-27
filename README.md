# calendar-app

calendar app with Vite + React + TS + Stitches

# 🤖 Установка AI-ассистента Claude в Calendar App

## 📋 Что включено

Полнофункциональный AI-ассистент с возможностями:

- ✅ Создание событий из естественного языка
- ✅ Редактирование и удаление событий
- ✅ Умный анализ расписания
- ✅ Поиск оптимального времени для встреч
- ✅ Обнаружение конфликтов
- ✅ Контекстный чат с памятью диалога
- ✅ Быстрые действия
- ✅ Адаптивный дизайн

## 🚀 Шаг 1: Установка зависимостей

### Backend (Node.js сервер)

Создайте папку `server` в корне проекта:

```bash
mkdir server
cd server
npm init -y
```

Установите зависимости:

```bash
npm install @anthropic-ai/sdk express cors dotenv
npm install -D typescript @types/express @types/cors @types/node ts-node nodemon
```

### Frontend

В корне React приложения:

```bash
npm install
```

## 🔧 Шаг 2: Конфигурация

### Backend Setup

1. **Создайте `server/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

2. **Создайте `server/src/server.ts`** - скопируйте код из артефакта "Backend API для Claude AI"

3. **Создайте `server/.env`:**

```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

4. **Обновите `server/package.json`:**

```json
{
  "name": "calendar-ai-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.6",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
```

### Frontend Setup

1. **Создайте `src/services/aiService.ts`** - скопируйте код из артефакта "Frontend Service для AI"

2. **Создайте `src/components/AIAssistant/AIAssistant.tsx`** - скопируйте код из артефакта "AI Assistant Component"

3. **Обновите `.env` в корне проекта:**

```env
VITE_AI_API_URL=http://localhost:3001
```

## 🎯 Шаг 3: Интеграция в приложение

Откройте ваш главный компонент (например, `App.tsx`) и добавьте:

```typescript
import { AIAssistant } from './components/AIAssistant/AIAssistant';
import { useState } from 'react';

function App() {
  const [events, setEvents] = useState([/* ваши события */]);

  const handleEventCreate = (event) => {
    setEvents([...events, { ...event, id: Date.now().toString() }]);
  };

  const handleEventUpdate = (updatedEvent) => {
    setEvents(events.map(e =>
      e.id === updatedEvent.id ?
```
