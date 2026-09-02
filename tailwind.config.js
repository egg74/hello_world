/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cash: '#34d399',
        hype: '#fbbf24',
        drama: '#f43f5e',
        energy: '#818cf8',
      },
    },
  },
  plugins: [],
};
