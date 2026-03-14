import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        gentlePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.4s ease-out forwards",
        gentlePulse: "gentlePulse 2.5s ease-in-out infinite",
      },
      colors: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        muted: "#71717a",
        mutedForeground: "#a1a1aa",
        border: "#27272a",
        accent: "#3f3f46",
        card: "#18181b",
        cardForeground: "#fafafa",
        silver: "#a1a1aa",
        grey: "#71717a",
      },
    },
  },
  plugins: [],
};
export default config;
