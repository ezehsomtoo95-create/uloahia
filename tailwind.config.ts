import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        border: "var(--border)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        indigo: "var(--indigo)",
      },
      borderRadius: {
        app: "16px",
        card: "14px",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(20, 20, 22, 0.08)",
      },
      transitionDuration: {
        app: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
