/** @type {import('tailwindcss').Config} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  content: [
    path.resolve(__dirname, "index.html"),
    path.resolve(__dirname, "src/**/*.{ts,tsx}"),
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Design tokens — OKLCH-based, dark-first
        ink: {
          50: "oklch(0.98 0.002 270)",
          100: "oklch(0.95 0.003 270)",
          200: "oklch(0.85 0.005 270)",
          300: "oklch(0.72 0.008 270)",
          400: "oklch(0.60 0.010 270)",
          500: "oklch(0.50 0.012 270)",
          600: "oklch(0.40 0.010 270)",
          700: "oklch(0.30 0.008 270)",
          800: "oklch(0.20 0.005 270)",
          900: "oklch(0.12 0.004 270)",
          950: "oklch(0.08 0.003 270)",
          black: "oklch(0.04 0.002 270)",
        },
        accent: {
          DEFAULT: "oklch(0.65 0.20 250)",
          hover: "oklch(0.70 0.22 250)",
          muted: "oklch(0.50 0.15 250)",
          glow: "oklch(0.65 0.20 250 / 0.15)",
        },
        success: {
          DEFAULT: "oklch(0.70 0.18 145)",
          muted: "oklch(0.50 0.12 145)",
          glow: "oklch(0.70 0.18 145 / 0.12)",
        },
        warning: {
          DEFAULT: "oklch(0.75 0.15 85)",
          muted: "oklch(0.55 0.12 85)",
          glow: "oklch(0.75 0.15 85 / 0.12)",
        },
        danger: {
          DEFAULT: "oklch(0.62 0.22 25)",
          muted: "oklch(0.48 0.18 25)",
          glow: "oklch(0.62 0.22 25 / 0.12)",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Type scale: 12, 14, 16, 18, 24, 32, 48, 64
        "display": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "hero": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        // Cards: 12-16px, pills: full, inputs: 10px
        card: "14px",
        input: "10px",
      },
      boxShadow: {
        // Soft, diffused ambient shadows — no harsh drops
        ambient: "0 2px 8px oklch(0 0 0 / 0.15), 0 8px 24px oklch(0 0 0 / 0.08)",
        elevated: "0 4px 12px oklch(0 0 0 / 0.20), 0 16px 48px oklch(0 0 0 / 0.12)",
        glow: "0 0 24px oklch(0.65 0.20 250 / 0.15)",
        "inner-highlight": "inset 0 1px 1px oklch(1 0 0 / 0.06)",
      },
      transitionTimingFunction: {
        // Custom cubic-bezier — no linear or ease-in-out
        fluid: "cubic-bezier(0.32, 0.72, 0, 1)",
        "fluid-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "fluid-in": "cubic-bezier(0.7, 0, 0.84, 0)",
      },
      animation: {
        "shimmer": "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
