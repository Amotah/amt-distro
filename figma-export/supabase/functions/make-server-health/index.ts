import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(() => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
});