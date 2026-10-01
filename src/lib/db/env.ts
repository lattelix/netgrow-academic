// Loads developer-local environment variables for commands that run outside
// Next.js (tsx scripts, Vitest, Playwright global setup). `next dev`/`build`/
// `start` already load `.env.local` on their own, so this is only needed here.
export function loadLocalEnv(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
