import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        bg: {
          base:     "hsl(var(--bg-base))",
          surface:  "hsl(var(--bg-surface))",
          elevated: "hsl(var(--bg-elevated))",
          inset:    "hsl(var(--bg-inset))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          strong:  "hsl(var(--line-strong))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          muted:   "hsl(var(--ink-muted))",
          dim:     "hsl(var(--ink-dim))",
          inverse: "hsl(var(--ink-inverse))",
        },
        accent: {
          DEFAULT:  "hsl(var(--accent))",
          hover:    "hsl(var(--accent-hover))",
          contrast: "hsl(var(--accent-contrast))",
          subtle:   "hsl(var(--accent-subtle))",
        },
        positive: { DEFAULT: "hsl(var(--positive))", subtle: "hsl(var(--positive-subtle))" },
        negative: { DEFAULT: "hsl(var(--negative))", subtle: "hsl(var(--negative-subtle))" },
        warning:  { DEFAULT: "hsl(var(--warning))",  subtle: "hsl(var(--warning-subtle))" },
        info:     { DEFAULT: "hsl(var(--info))",     subtle: "hsl(var(--info-subtle))" },
      },
      fontFamily: {
        // Apple-first stack: SF Pro nos dispositivos Apple, Inter / Segoe / Roboto fallback
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "system-ui",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "Monaco",
          "Cascadia Code",
          "monospace",
        ],
        // Display = Sans em peso/letter-spacing diferente, não mudamos a família
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "system-ui",
          "Inter",
          "sans-serif",
        ],
      },
      fontSize: {
        // Apple type scale — mais generoso, line-heights maiores que SaaS típico
        "2xs": ["0.6875rem", { lineHeight: "1rem",   letterSpacing: "0" }],
        xs:   ["0.75rem",   { lineHeight: "1.125rem", letterSpacing: "0" }],
        sm:   ["0.8125rem", { lineHeight: "1.25rem", letterSpacing: "-0.005em" }],
        base: ["0.9375rem", { lineHeight: "1.5rem",  letterSpacing: "-0.01em" }],
        md:   ["1rem",      { lineHeight: "1.5rem",  letterSpacing: "-0.011em" }],
        lg:   ["1.125rem",  { lineHeight: "1.625rem", letterSpacing: "-0.015em" }],
        xl:   ["1.375rem",  { lineHeight: "1.875rem", letterSpacing: "-0.02em" }],
        "2xl":["1.625rem",  { lineHeight: "2rem",     letterSpacing: "-0.022em" }],
        "3xl":["2rem",      { lineHeight: "2.375rem", letterSpacing: "-0.025em" }],
        "4xl":["2.5rem",    { lineHeight: "2.75rem",  letterSpacing: "-0.03em" }],
        "5xl":["3.25rem",   { lineHeight: "1.05",     letterSpacing: "-0.035em" }],
        "6xl":["4rem",      { lineHeight: "1.05",     letterSpacing: "-0.04em" }],
      },
      borderRadius: {
        // Apple usa raios maiores — 8 a 16 nos cards/botões
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        // Sombras suaves Apple — múltiplas camadas, blur grande
        "elev-1": "0 0 0 1px hsl(var(--line)), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "elev-2": "0 0 0 1px hsl(var(--line)), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)",
        "elev-3": "0 0 0 0.5px hsl(var(--line) / 0.6), 0 12px 32px -8px rgb(0 0 0 / 0.12), 0 8px 16px -4px rgb(0 0 0 / 0.08)",
        "elev-4": "0 0 0 0.5px hsl(var(--line) / 0.5), 0 24px 48px -12px rgb(0 0 0 / 0.18), 0 12px 24px -6px rgb(0 0 0 / 0.10)",
        "focus":  "0 0 0 4px hsl(var(--accent) / 0.18)",
        // iOS button — top-light gradient sutil
        "button-top-light": "inset 0 1px 0 0 rgb(255 255 255 / 0.18)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1",   transform: "scale(1)" },
          "50%":      { opacity: "0.5", transform: "scale(0.85)" },
        },
        "spring-in": {
          // Curva Apple-style — snappy mas com leve overshoot
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        // Curvas mais Apple — 280-320ms com cubic-bezier característico
        "fade-in":   "fade-in 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-up":  "slide-up 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        "shimmer":   "shimmer 2s linear infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "spring-in": "spring-in 320ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionTimingFunction: {
        // Apple spring — usado em interações snappy
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
        // iOS scroll feel
        ios: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
