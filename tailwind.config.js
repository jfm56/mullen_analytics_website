/**** TailwindCSS Config ****/
// NOTE: This project uses Tailwind v4, which is configured CSS-first via
// `@theme` in src/app/globals.css — design tokens live THERE, not here.
// This file is kept only for `content`/`darkMode` compatibility; adding colors
// to `theme.extend` below has NO effect in v4.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,jsx,ts,tsx,mdx}',
    './src/components/**/*.{js,jsx,ts,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
