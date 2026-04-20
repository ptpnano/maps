export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.warn('[Cron] CRON_SECRET not set, skipping auto-timeout cronjob');
      return;
    }

    const port = process.env.PORT || '3000';
    const baseUrl = `http://localhost:${port}`;

    // Wait 10s for server to be ready before starting
    setTimeout(() => {
      console.log('[Cron] Starting auto-timeout cronjob (every 60s)');

      setInterval(async () => {
        try {
          const res = await fetch(`${baseUrl}/api/cron/timeout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cron-secret': cronSecret,
            },
          });
          if (!res.ok) {
            console.error(`[Cron] Timeout cronjob failed: ${res.status}`);
          }
        } catch {
          // Server might not be ready yet, silently ignore
        }
      }, 60_000);
    }, 10_000);
  }
}
