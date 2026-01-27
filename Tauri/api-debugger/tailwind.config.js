/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 科技感深色主题
        bg: {
          primary: "#0a0e14",
          secondary: "#11151c",
          tertiary: "#1a1f2e",
          hover: "#252b3b",
        },
        border: {
          primary: "#2d3548",
          secondary: "#3d4560",
          accent: "#4fc3f7",
        },
        text: {
          primary: "#e4e8f0",
          secondary: "#8b95a8",
          muted: "#5c6478",
        },
        accent: {
          blue: "#4fc3f7",
          green: "#66bb6a",
          orange: "#ffb74d",
          red: "#ef5350",
          purple: "#ab47bc",
          cyan: "#26c6da",
        },
        method: {
          get: "#66bb6a",
          post: "#ffb74d",
          put: "#42a5f5",
          delete: "#ef5350",
          patch: "#ab47bc",
          head: "#78909c",
          options: "#78909c",
        },
      },
      fontFamily: {
        sans: ["JetBrains Mono", "Fira Code", "monospace"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(79, 195, 247, 0.15)",
        "glow-lg": "0 0 40px rgba(79, 195, 247, 0.2)",
      },
    },
  },
  plugins: [],
};
