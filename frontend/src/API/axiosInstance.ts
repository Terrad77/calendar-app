// frontend/src/API/axiosInstance.ts
import axios from "axios";

// Використовуємо змінну оточення, яку Vite підставить під час збірки
// Локально вона буде взята з .env.development.local
// На Vercel вона буде взята з налаштувань Vercel
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const instance = axios.create({
  baseURL: BACKEND_API_BASE_URL, // <-- ВИПРАВЛЕНО: використовуємо змінну оточення
  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;
