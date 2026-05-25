import { defineConfig } from "wxt";

/** Sizes used for toolbar/browser_action icons (Firefox picks ~32–48px when pinned). */
const TOOLBAR_ICONS: Record<string, string> = {
  48: "icon/48.png",
  64: "icon/64.png",
  96: "icon/96.png",
  128: "icon/128.png",
};

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  dev: {
    server: {
      port: 3000,
    },
  },
  manifest: ({ browser }) => ({
    name: "SongSphere",
    description:
      "Control every playing music tab from one popup — Spotify, YouTube Music, YouTube, and more. Local-only, no analytics.",
    version: "0.1.0",
    permissions: [
      "tabs",
      "activeTab",
      "scripting",
      "storage",
      "alarms",
      ...(browser === "chrome" ? (["windows"] as const) : []),
    ],
    host_permissions: [
      "https://open.spotify.com/*",
      "https://music.youtube.com/*",
      "https://www.youtube.com/*",
      "https://youtube.com/*",
      "https://m.youtube.com/*",
      "http://*/*",
      "https://*/*",
    ],
    action: {
      default_title: "SongSphere",
      default_icon: TOOLBAR_ICONS,
    },
    commands: {
      "toggle-play": {
        suggested_key: { default: "Alt+Shift+P", mac: "Alt+Shift+P" },
        description: "Play or pause",
      },
      "next-track": {
        suggested_key: { default: "Alt+Shift+Right", mac: "Alt+Shift+Right" },
        description: "Next track",
      },
      "previous-track": {
        suggested_key: { default: "Alt+Shift+Left", mac: "Alt+Shift+Left" },
        description: "Previous track",
      },
      "toggle-like": {
        suggested_key: { default: "Alt+Shift+L", mac: "Alt+Shift+L" },
        description: "Toggle like",
      },
    },
    browser_specific_settings: { gecko: { id: "songsphere@local.dev" } },
    web_accessible_resources: [
      {
        resources: ["/songsphere-main-runtime.js"],
        matches: ["<all_urls>"],
      },
    ],
  }),
});
