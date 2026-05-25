export interface TelemetrySnapshot {
  deltaFlushes: number;
  patchDeltas: number;
  fullDeltas: number;
  hydrationPromotions: number;
  artworkCacheHits: number;
  artworkCacheMisses: number;
  dormantWakes: number;
  renderPasses: number;
  deltaApplies: number;
}
