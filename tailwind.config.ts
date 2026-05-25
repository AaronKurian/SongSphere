import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/entrypoints/**/*.{html,ts,tsx}",
    "./src/popup/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0b0b0f",
          elevated: "#15151d",
          muted: "#1c1c26",
          border: "#26263340",
        },
        brand: {
          DEFAULT: "#7c5cff",
          soft: "#a690ff",
          glow: "#4c2cff",
        },
        text: {
          primary: "#f5f5fa",
          secondary: "#a1a1b3",
          muted: "#6b6b80",
        },
        platform: {
          spotify: "#1db954",
          ytmusic: "#ff0033",
          youtube: "#ff0000",
        },
      },
      boxShadow: {
        glow: "0 0 24px -8px rgba(124, 92, 255, 0.55)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 220ms ease-out",
        "slide-left": "slideLeft 220ms ease-out",
        "slide-right": "slideRight 220ms ease-out",
        "pulse-soft": "pulseSoft 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
