/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0F172A", 800: "#1E293B", 600: "#334155" },
        cyan:  { DEFAULT: "#0891B2", 50: "#ECFEFF", 100: "#CFFAFE", 600: "#0891B2", 700: "#0E7490" },
        paper: "#F8FAFC",
        ink:   "#0F172A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        "spin-slow":    "spin 1.5s linear infinite",
        "fade-up":      "fade-up 0.3s ease-out",
      },
      keyframes: {
        "pulse-border": {
          "0%, 100%": { borderColor: "#CBD5E1" },
          "50%":       { borderColor: "#0891B2" },
        },
        "fade-up": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
