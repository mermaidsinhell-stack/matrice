/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif-display': ['"Playfair Display"', 'serif'],
        'geo-sans': ['"Jost"', 'sans-serif'],
      },
      colors: {
        cream: '#FDFEF5',
        ink: '#1A1917',
        accent: '#E84E36',
        'accent-dark': '#D43D26',
        'bar-red': '#B54632',
        muted: '#888',
        'border-light': '#E5E5E5',
        'bg-card': '#FAFAFA',
        lavender: '#DCD6F7',
        parchment: '#EAE6D9',
      },
    },
  },
  plugins: [],
};
