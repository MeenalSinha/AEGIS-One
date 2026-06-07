/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "'Inter'", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "scan": "scan 3s linear infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%,100%": { opacity:"1", boxShadow:"0 0 12px rgba(0,255,136,0.35)" },
          "50%": { opacity:"0.7", boxShadow:"0 0 28px rgba(0,255,136,0.65)" },
        },
        "scan": {
          "0%": { transform:"translateY(-100%)" },
          "100%": { transform:"translateY(100vh)" },
        },
        "fade-in": { "0%": { opacity:"0" }, "100%": { opacity:"1" } },
        "slide-up": {
          "0%": { opacity:"0", transform:"translateY(16px)" },
          "100%": { opacity:"1", transform:"translateY(0)" },
        },
        "float": {
          "0%,100%": { transform:"translateY(0px)" },
          "50%": { transform:"translateY(-8px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition:"-200% 0" },
          "100%": { backgroundPosition:"200% 0" },
        },
      },
    },
  },
  plugins: [],
};
