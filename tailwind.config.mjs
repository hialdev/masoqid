/** @type {import('tailwindcss').Config} */
export default {
   content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
   darkMode: false, // Disable dark mode completely
   theme: {
      extend: {
         colors: {
            primary: "#195de6",
            "primary-dark": "#1045b3",
            "background-light": "#ffffff",
            "background-subtle": "#f8f9fc",
            "background-dark": "#111621",
            "text-main": "#0e121b",
            "text-muted": "#4e6797",
         },
         fontFamily: {
            display: ["Manrope", "sans-serif"],
         },
         borderRadius: {
            DEFAULT: "0.375rem",
            lg: "0.5rem",
            xl: "0.75rem",
            full: "9999px",
         },
      },
   },
   plugins: [],
};
