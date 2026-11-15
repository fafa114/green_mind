/// <reference types="vite/client" />
<<<<<<< HEAD
=======

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string
  readonly VITE_REAL_MODULES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}
>>>>>>> origin/master
