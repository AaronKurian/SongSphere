import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
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
    action: { default_title: "SongSphere" },
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
