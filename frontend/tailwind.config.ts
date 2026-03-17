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
        primary: {
          50: "#e8faf8",
          100: "#c5f2ed",
          200: "#9be8e0",
          300: "#6dddd4",
          400: "#3ed0c5",
          500: "#1db8a8",
          600: "#179e92",
          700: "#0f7a72",
          800: "#0a5c56",
          900: "#072c29",
          950: "#041a18",
        },
        teal: {
          DEFAULT: "#1db8a8",
          50: "#e8faf8",
          100: "#c5f2ed",
          300: "#6dddd4",
          500: "#1db8a8",
          700: "#0f7a72",
          900: "#072c29",
        },
        amber: {
          DEFAULT: "#f07828",
          400: "#f5a060",
          500: "#f07828",
          600: "#d05e10",
          700: "#a84a0d",
        },
        green: {
          plumbob: "#3ec95a",
        },
        red: {
          lobster: "#e63030",
        },
        forge: {
          dark: "#060c0b",
          white: "#e4f0ee",
          card: "#0a1412",
          border: "#1a2e2b",
        },
      },
      fontFamily: {
        spaceGrotesk: ["Space Grotesk", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        jetbrainsMono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
