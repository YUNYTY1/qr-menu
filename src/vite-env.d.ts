/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_BASE_DOMAIN?: string
  readonly VITE_DEFAULT_COUNTRY_CODE?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
