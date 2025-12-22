/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'background': '#F8F9FA',        // Extreme light cool gray
        'surface': '#FFFFFF',          // Pure white for cards/surfaces
        'primary': '#1a73e8',          // Google's signature blue
        'secondary': '#8953f3',        // Soft violet for AI features
        'text-primary': '#202124',     // Deep dark gray for main text
        'text-secondary': '#70757a',   // Softer gray for helper text
        'border-subtle': '#dadce0',     // Thin, subtle borders
        'text-on-primary': '#FFFFFF',    // White text on primary color
      },
      boxShadow: {
        // "A barely noticeable, very soft and wide shadow to make them feel slightly lifted"
        'ambient': '0 12px 24px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    forms,
  ],
};
