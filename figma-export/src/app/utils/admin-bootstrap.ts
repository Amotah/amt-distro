import { projectId, publicAnonKey } from '/utils/supabase/info';
import { BACKEND_API_BASE_URL } from './backend-api-base';

export type AdminBootstrapResult = {
  success: boolean;
  endpoint?: string;
  credentials?: {
    username?: string;
    email?: string;
    password?: string;
  };
  attempts: Array<{ endpoint: string; ok: boolean; status?: number; message?: string }>;
  error?: string;
};

function buildBootstrapEndpoints() {
  const normalizedBase = BACKEND_API_BASE_URL.replace(/\/$/, '');
  const supabaseBase = `https://${projectId}.supabase.co/functions/v1`;

  return [
    `${normalizedBase}/init-admin`,
    `${normalizedBase}/make-server-79198001/init-admin`,
    `${supabaseBase}/server/make-server-79198001/init-admin`,
    `${supabaseBase}/make-server-79198001/init-admin`,
    `${supabaseBase}/make-server-79198001/make-server-79198001/init-admin`,
  ];
}

export async function initializeDefaultAdminAccount(): Promise<AdminBootstrapResult> {
  const endpoints = buildBootstrapEndpoints();
  const attempts: AdminBootstrapResult['attempts'] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          apikey: publicAnonKey,
          'Content-Type': 'application/json',
        },
      });

      const body = await response.json().catch(() => ({}));

      attempts.push({
        endpoint,
        ok: response.ok,
        status: response.status,
        message: typeof body?.error === 'string' ? body.error : undefined,
      });

      if (response.ok && body?.success) {
        return {
          success: true,
          endpoint,
          credentials: body.credentials,
          attempts,
        };
      }
    } catch (error) {
      attempts.push({
        endpoint,
        ok: false,
        message: error instanceof Error ? error.message : 'Network error',
      });
    }
  }

  return {
    success: false,
    attempts,
    error: 'Unable to initialize default admin account from available endpoints.',
  };
}
