// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        flash: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(75, 85, 99, 0.7)' }, // A semi-transparent gray-500
        }
      },
      animation: {
        flash: 'flash 1s ease-in-out',
      }
    },
  },
  plugins: [
    // Scrollbar styling plugin (Tailwind v3 compatible)
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
  variants: {
    scrollbar: ['rounded', 'hover'],
  },
}
