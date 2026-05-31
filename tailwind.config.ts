import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Colores de marca Plati (HEX crudos, para bg-tomate, text-hierba, etc.)
        tomate: {
          DEFAULT: 'var(--plati-tomate)',
          700: 'var(--plati-tomate-700)',
          soft: 'var(--plati-tomate-soft)',
          pale: 'var(--plati-tomate-pale)',
        },
        tinta: {
          DEFAULT: 'var(--plati-tinta)',
          90: 'var(--plati-tinta-90)',
        },
        hueso: {
          DEFAULT: 'var(--plati-hueso)',
          warm: 'var(--plati-hueso-warm)',
          dim: 'var(--plati-hueso-dim)',
        },
        yema: {
          DEFAULT: 'var(--plati-yema)',
          soft: 'var(--plati-yema-soft)',
        },
        hierba: {
          DEFAULT: 'var(--plati-hierba)',
          700: 'var(--plati-hierba-700)',
          soft: 'var(--plati-hierba-soft)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Colores semánticos del sistema (alineados a la paleta Plati)
        success: {
          DEFAULT: 'var(--plati-hierba)',
          foreground: 'var(--plati-hueso)',
        },
        warning: {
          DEFAULT: 'var(--plati-yema)',
          foreground: 'var(--plati-tinta)',
        },
        error: {
          DEFAULT: 'var(--plati-tomate)',
          foreground: 'var(--plati-hueso)',
        },
        info: {
          DEFAULT: 'var(--plati-tinta)',
          foreground: 'var(--plati-hueso)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        pill: 'var(--radius-pill)',
      },
      maxWidth: {
        plati: 'var(--maxw)',
      },
      boxShadow: {
        'plati-1': 'var(--shadow-1)',
        'plati-2': 'var(--shadow-2)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

