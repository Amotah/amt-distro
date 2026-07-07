const configuredApiBaseUrl = (((import.meta as any).env?.VITE_AMT_DISTRO_API_BASE_URL as string) || '')
  .trim()
  .replace(/\/$/, '');

const configuredSupabaseUrl = (((import.meta as any).env?.VITE_SUPABASE_URL as string) || '')
  .trim()
  .replace(/\/$/, '');

const derivedSupabaseFunctionsBase = configuredSupabaseUrl
  ? `${configuredSupabaseUrl}/functions/v1/make-server-79198001`
  : '';

export const BACKEND_API_BASE_URL = configuredApiBaseUrl
  || derivedSupabaseFunctionsBase
  || 'https://amt-distro-api.vercel.app';
