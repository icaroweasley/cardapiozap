/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        podium: ['"Archivo Black"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
      },
      colors: {
        brutal: {
          light: '#000000', // Override brutalist to dark
          dark: '#ffffff',
          accent: '#ffffff',
        }
      }
    },
  },
  plugins: [],
}
