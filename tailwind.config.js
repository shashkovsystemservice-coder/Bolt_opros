
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F9F9F9', // Еще более светлый фон для чистоты
        border: '#EDEDED',   // Мягкая граница
        
        // Слегка десатурированный, более серьезный синий
        primary: '#4338CA', 

        text: {
          primary: '#0A0A0A',   // Глубокий черный для максимального контраста
          secondary: '#525252', // Сбалансированный серый для описаний
          light: '#737373',     // Для второстепенных меток
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Тонкая, профессиональная тень
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
};
