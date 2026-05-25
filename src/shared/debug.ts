import { buildLogTag } from "~/shared/build";
import { isDevTelemetryEnabled } from "~/shared/dev-mode";

const PREFIX = "[SongSphere]";

export function debugEnabled(): boolean {
  return import.meta.env.DEV || isDevTelemetryEnabled();
}

export function debugLog(scope: string, ...args: unknown[]): void {
  if (!debugEnabled()) return;
  console.log(`${PREFIX}:${scope}`, buildLogTag(), ...args);
}

export function debugWarn(scope: string, ...args: unknown[]): void {
  if (!debugEnabled()) return;
  console.warn(`${PREFIX}:${scope}`, buildLogTag(), ...args);
}

export function debugError(scope: string, ...args: unknown[]): void {
  if (!debugEnabled()) return;
  console.error(`${PREFIX}:${scope}`, buildLogTag(), ...args);
}
