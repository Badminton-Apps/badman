/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORT: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
