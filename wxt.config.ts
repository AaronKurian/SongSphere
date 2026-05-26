import { defineConfig } from "wxt";
import type { Plugin } from "vite";

/** Dev-only: WXT serves unlisted pages from source paths, not /{name}.html. */
function unlistedPageDevAliases(): Plugin {
  const aliases: Record<string, string> = {
    "/landing.html": "/src/entrypoints/landing/index.html",
    "/privacy.html": "/src/entrypoints/privacy/index.html",
    "/license.html": "/src/entrypoints/license/index.html",
  };
  return {
    name: "songsphere-unlisted-page-dev-aliases",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url ?? "";
        const q = raw.indexOf("?");
        const path = q >= 0 ? raw.slice(0, q) : raw;
        const target = aliases[path];
        if (target) req.url = target + (q >= 0 ? raw.slice(q) : "");
        next();
      });
    },
  };
}

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
  vite: () => ({
    plugins: [unlistedPageDevAliases()],
  }),
  dev: {
    server: {
      port: 3000,
    },
  },
  manifest: ({ browser }) => ({
    name: "SongSphere",
    description:
      "Control every playing music tab from one popup - Spotify, YouTube Music, YouTube and more. Local-only, no analytics.",
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
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "songsphere@aaron.dev",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          },
        }
      : {}),
    web_accessible_resources: [
      {
        resources: ["/songsphere-main-runtime.js"],
        matches: ["<all_urls>"],
      },
    ],
  }),
});
