/** @type {import('tailwindcss').Config} */
export default {
  // Enable dark mode via class or the data-theme attribute so
  // `dark:` utilities work when we set `data-theme="dark"` on the document.
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
