const DEV_KEY = "songsphere:dev";

/** Dev telemetry flag — `localStorage.setItem('songsphere:dev','1')` in any extension page console. */

export function isDevTelemetryEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevTelemetryEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEV_KEY, "1");
    else localStorage.removeItem(DEV_KEY);
  } catch {
    /* private mode */
  }
}
