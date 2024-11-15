/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: ["./templates/*.html"],
  theme: {
    extend: {
      colors:{
        chatblack: {50: '#343541'}
      }
    },
  },
  plugins: [],
}

