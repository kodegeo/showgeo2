/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Showgeo Brand Colors
        brand: {
          red: {
            primary: "#CD000E",
            dark: "#860005",
          },
          gold: "#F49600",
          blue: "#1FB5FC",
          dark: "#0B0B0B",
          gray: {
            text: "#9A9A9A",
          },
        },
      },
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      letterSpacing: {
        tight: "-0.02em",
        tighter: "-0.03em",
      },
      boxShadow: {
        'brand-red': '0 10px 40px -10px rgba(205, 0, 14, 0.3)',
      },
      animation: {
        'fade-in': 'fade-in 0.8s ease-out',
        'fade-in-up': 'fade-in-up 0.8s ease-out',
        'slide-down': 'slide-down 0.8s ease-out',
      },
    },
  },
  plugins: [],
};
