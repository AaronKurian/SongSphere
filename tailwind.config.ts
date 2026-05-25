import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/entrypoints/**/*.{html,ts,tsx}",
    "./src/popup/**/*.{ts,tsx}",
    "./src/landing/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          muted: "var(--surface-muted)",
        },
        brand: {
          DEFAULT: "var(--accent)",
          soft: "color-mix(in srgb, var(--accent) 40%, transparent)",
          glow: "#4c2cff",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        platform: {
          spotify: "#1db954",
          ytmusic: "#ff0033",
          youtube: "#ff4400",
        },
      },
      fontFamily: {
        sans: [
          "DM Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 24px -8px color-mix(in srgb, var(--accent) 55%, transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
