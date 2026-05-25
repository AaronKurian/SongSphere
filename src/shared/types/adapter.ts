import type { Platform, TrackInfo } from "./player";

export interface AdapterCapabilities {
  playPause: boolean;
  next: boolean;
  previous: boolean;
  volume: boolean;
  seek: boolean;
  like: boolean;
  queue: boolean;
}

export const FULL_CAPABILITIES: AdapterCapabilities = {
  playPause: true,
  next: true,
  previous: true,
  volume: true,
  seek: true,
  like: true,
  queue: false,
};

export const SPOTIFY_CAPABILITIES: AdapterCapabilities = {
  ...FULL_CAPABILITIES,
  volume: false,
};

export const YOUTUBE_CAPABILITIES: AdapterCapabilities = {
  playPause: true,
  next: true,
  previous: true,
  volume: true,
  seek: true,
  like: true,
  queue: false,
};

export const GENERIC_CAPABILITIES: AdapterCapabilities = {
  playPause: true,
  next: true,
  previous: true,
  volume: true,
  seek: true,
  like: false,
  queue: false,
};

export interface MusicAdapter {
  readonly platform: Platform;
  readonly capabilities: AdapterCapabilities;
  isReady(): boolean;
  getTrackInfo(): Promise<TrackInfo | null>;
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlay(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  setVolume(volume: number): Promise<void>;
  seek(position: number): Promise<void>;
  toggleLike(): Promise<void>;
  subscribe(onChange: (track: TrackInfo | null) => void): () => void;
  validateSelectors?(): Record<string, boolean>;
}

export type AdapterFactory = () => MusicAdapter;
