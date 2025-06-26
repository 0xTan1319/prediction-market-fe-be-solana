import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Pool Odds brand colors - Deep blues + neon greens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Pool Odds brand colors
        poolodds: {
          navy: "#0a0b2e",
          "navy-light": "#1a1d4a",
          "navy-dark": "#050614",
          blue: "#2563eb",
          "blue-light": "#3b82f6",
          "blue-dark": "#1d4ed8",
          green: "#10b981",
          "green-light": "#34d399",
          "green-dark": "#059669",
          purple: "#8b5cf6",
          "purple-light": "#a78bfa",
          "purple-dark": "#7c3aed",
          gray: "#64748b",
          "gray-light": "#94a3b8",
          "gray-dark": "#475569",
        },
      },
      backgroundImage: {
        "poolodds-gradient": "linear-gradient(135deg, #0a0b2e 0%, #050614 100%)",
        "poolodds-card": "linear-gradient(135deg, #1a1d4a 0%, #0a0b2e 100%)",
        "poolodds-accent": "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        "poolodds-purple": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pool-ripple": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "odds-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pool-ripple": "pool-ripple 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "odds-pulse": "odds-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
