import { getCapabilities, isMusicSessionPlatform } from "~/shared/constants";
import { ext } from "~/shared/browser";
import type { SessionsPayload } from "~/shared/types/session";
import type { Platform, TrackInfo } from "~/shared/types/player";
import type { SessionHydration } from "~/shared/types/session";
import type { RegistryEntry } from "~/background/session";

/** Session persistence in extension storage (meta + per-tab snapshots). */

const SESSIONS_KEY = "sphere:sessions";
const META_KEY = "sphere:meta";

export interface PersistedMeta {
  selectedSessionId: number | null;
  activeSessionId?: number | null;
  entries: {
    tabId: number;
    platform: Platform;
    track: TrackInfo | null;
    updatedAt: number;
    lastInteraction: number;
    hydration?: SessionHydration;
  }[];
}

const area = () => ext.storage.session ?? ext.storage.local;

function migrateHydration(tier: SessionHydration | undefined): SessionHydration {
  return tier ?? "minimal";
}

export async function loadCachedSessions(): Promise<SessionsPayload | null> {
  try {
    const data = await area().get(SESSIONS_KEY);
    const payload = data[SESSIONS_KEY] as SessionsPayload | undefined;
    if (!payload?.sessions) return null;
    if ("activeSessionId" in payload && !("selectedSessionId" in payload)) {
      const legacy = payload as SessionsPayload & { activeSessionId?: number | null };
      return { ...legacy, selectedSessionId: legacy.activeSessionId ?? null };
    }
    if (!payload.stripOrder?.length) {
      payload.stripOrder = payload.sessions.map((s) => s.tabId);
    }
    const selected = payload.sessions.find((s) => s.tabId === payload.selectedSessionId);
    const freshCaps = getCapabilities(selected?.platform ?? null);
    if (
      payload.capabilities.next !== freshCaps.next ||
      payload.capabilities.previous !== freshCaps.previous
    ) {
      payload.capabilities = freshCaps;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function saveCachedSessions(payload: SessionsPayload): Promise<void> {
  try {
    await area().set({ [SESSIONS_KEY]: payload });
  } catch {
    /* storage unavailable */
  }
}

export async function loadPersistedMeta(): Promise<{
  selectedSessionId: number | null;
  entries: Map<number, RegistryEntry>;
} | null> {
  try {
    const data = await area().get(META_KEY);
    const meta = data[META_KEY] as PersistedMeta | undefined;
    if (!meta) return null;
    const entries = new Map<number, RegistryEntry>();
    for (const e of meta.entries) {
      entries.set(e.tabId, {
        ...e,
        hydration: migrateHydration(e.hydration),
      });
    }
    return {
      selectedSessionId: meta.selectedSessionId ?? meta.activeSessionId ?? null,
      entries,
    };
  } catch {
    return null;
  }
}

export async function savePersistedMeta(
  selectedSessionId: number | null,
  entries: Map<number, RegistryEntry>,
): Promise<void> {
  try {
    const musicEntries = [...entries.values()].filter((e) =>
      isMusicSessionPlatform(e.platform),
    );
    const meta: PersistedMeta = {
      selectedSessionId,
      entries: musicEntries,
    };
    await area().set({ [META_KEY]: meta });
  } catch {
    /* storage unavailable */
  }
}
