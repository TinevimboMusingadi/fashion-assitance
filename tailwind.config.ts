import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
