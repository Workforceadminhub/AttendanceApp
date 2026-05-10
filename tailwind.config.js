/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: { max: "640px" },
      },
      colors: {
        cream: {
          DEFAULT: "#FAFAF7",
          50: "#FCFCFA",
          100: "#FAFAF7",
          200: "#F4F4EE",
        },
        ink: {
          DEFAULT: "#0A0E1A",
          900: "#0A0E1A",
          800: "#1A1F2E",
          700: "#2C3142",
          600: "#4A4F5E",
          500: "#6B6B66",
          400: "#9A9A95",
          300: "#C7C7C2",
          200: "#E5E5E0",
          100: "#F0F0EB",
        },
        sienna: {
          DEFAULT: "#B5471F",
          dark: "#8E3717",
          light: "#D26840",
          50: "#FBEFE9",
        },
        forest: {
          DEFAULT: "#4A6B3F",
          50: "#EFF3ED",
        },
        mustard: {
          DEFAULT: "#A87B0F",
          50: "#F8F1DE",
        },
        brick: {
          DEFAULT: "#A8311E",
          50: "#F8E5E1",
        },
      },
      fontFamily: {
        sans: [
          '"Geist Sans"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"Geist Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.7rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "1.85rem", letterSpacing: "-0.015em" }],
        "3xl": ["1.875rem", { lineHeight: "2.15rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
        "5xl": ["3.25rem", { lineHeight: "3.4rem", letterSpacing: "-0.03em" }],
      },
      letterSpacing: {
        tag: "0.08em",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        none: "none",
        sheet: "0 1px 2px rgba(10, 14, 26, 0.04)",
        pop: "0 8px 24px rgba(10, 14, 26, 0.08), 0 1px 2px rgba(10, 14, 26, 0.06)",
        ring: "0 0 0 1px #E5E5E0",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        sidebar: "240px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "live-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.45 },
        },
      },
      animation: {
        "sheet-up": "sheet-up 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 150ms ease-out",
        "live-pulse": "live-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
