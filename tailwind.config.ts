import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Paleta propia: violeta/índigo como color de marca + coral como
        // acento (badges de descuento, CTAs). Combinación elegida para no
        // parecerse al verde típico de las apps de pagos/descuentos.
        brand: {
          50: "#f2f1ff",
          100: "#e6e3ff",
          200: "#cec7ff",
          300: "#ab9dfd",
          400: "#8b7ff6",
          500: "#6d5df0",
          600: "#5a44e0",
          700: "#4733bb",
          800: "#392a92",
          900: "#2d2374",
        },
        accent: {
          50: "#fff4ed",
          100: "#ffe6d5",
          200: "#ffc9a8",
          300: "#ffa66c",
          400: "#ff8a3d",
          500: "#ff6b35",
          600: "#f0501a",
          700: "#c73d12",
          800: "#9e3214",
          900: "#7f2d16",
        },
      },
    },
  },
  plugins: [],
};
export default config;
