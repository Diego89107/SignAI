/** @type {import('tailwindcss').Config} */
export default {
  darkMode:'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        signai: {
          bg: "#0b0f19",
          surface: "#151822",
          border: "#1f2833",
          card: "#1c212c",
          muted: "#11131b",
          line: "#2a2f3b",
        },
      },
    },
  },
  plugins: [],
}
