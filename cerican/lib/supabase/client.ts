import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // #region debug-point A:browser-env-probe
  if (typeof window !== 'undefined') {
    void fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'supabase-env-missing',
        runId: 'pre-fix',
        hypothesisId: 'A',
        source: 'browser',
        message: '[DEBUG] browser Supabase env probe',
        data: {
          href: window.location.href,
          urlPresent: Boolean(url),
          keyPresent: Boolean(key),
          urlPrefix: url ? String(url).slice(0, 32) : '',
          keyLength: key ? String(key).length : 0,
        },
        ts: new Date().toISOString(),
      }),
    }).catch(() => {})
  }
  // #endregion
  return createBrowserClient(url, key)
}
