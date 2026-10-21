/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bambu: {
          green: '#00AE42',
          'green-dark': '#008B34',
          'green-light': '#33BE68',
          dark: '#1e1e1e',
          darker: '#141414',
          card: '#252526',
          border: '#333333',
          accent: '#0e70c0',
        }
      }
    },
  },
  plugins: [],
}
