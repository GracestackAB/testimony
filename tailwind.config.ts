import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Värdig, stillsam, hoppfull palett – ingen skrikig cyberpunk
        parchment: "#faf8f3",
        ink: "#1a1814",
        stone: {
          50: "#f8f7f4",
          100: "#ecebe6",
          200: "#d6d4cb",
          300: "#b8b4a7",
          400: "#8f8a7a",
          500: "#6b6657",
          600: "#524e42",
          700: "#3e3b33",
          800: "#2a2823",
          900: "#1a1814",
        },
        // Accent: varm, dämpad olivgrön (hopp, livets träd)
        olive: {
          50: "#f3f5ee",
          100: "#e1e7d2",
          300: "#b7c58d",
          500: "#7a8f4d",
          600: "#5f7438",
          700: "#4a5a2b",
        },
        // Sekundär: mjuk guld (bönesvar, hallelujah)
        gold: {
          300: "#e6c875",
          500: "#c19a3e",
          700: "#8c6a20",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
export default config;
