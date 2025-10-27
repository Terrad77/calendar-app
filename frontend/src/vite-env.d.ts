/// <reference types="vite/client" />
/// <reference path="./global.d.ts" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
