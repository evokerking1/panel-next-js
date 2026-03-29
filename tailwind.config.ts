import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"General Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

// ~ https://github.com/thavanish made this shitty code
