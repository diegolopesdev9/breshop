/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./src/**/*.{js,ts,jsx,tsx,css,html}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#FDFCFB", 
        "surface": "#FFFFFF",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F9F8F6",
        "surface-container": "#F4F2EE",
        "surface-container-high": "#EBE8E4",
        "surface-container-highest": "#E2DFDB",
        
        "on-background": "#1A1A1A", 
        "on-surface": "#1A1A1A",
        "on-surface-variant": "#555555",
        
        "primary": "#D93B18", 
        "primary-dark": "#A6270C", 
        "on-primary": "#FFFFFF",
        "primary-container": "#FFDED6",
        "on-primary-container": "#4A1100",
        
        "outline": "#E5E5E5",
        "outline-variant": "#D4D4D4",
        
        "error": "#ef4444",
        "on-error": "#ffffff",
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "unit": "4px",
        "container-max": "1440px",
        "stack-sm": "12px",
        "stack-md": "24px",
        "stack-lg": "48px",
        "gutter": "24px",
      },
      fontFamily: {
        "headline-xl": ["'Outfit'", "sans-serif"],
        "headline-lg": ["'Outfit'", "sans-serif"],
        "display-lg": ["'Outfit'", "sans-serif"],
        "body-xl": ["'Plus Jakarta Sans'", "sans-serif"],
        "body-md": ["'Plus Jakarta Sans'", "sans-serif"],
        "label-lg": ["'Plus Jakarta Sans'", "sans-serif"],
        "label-sm": ["'Plus Jakarta Sans'", "sans-serif"]
      }
    }
  },
  plugins: [],
};