/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1920px',  // Large monitors
    },
    extend: {
      spacing: {
        '0': '0px',
        'px': '1px',
        '0.5': '0.18rem',  // 2px * 0.9 = 1.8px
        '1': '0.225rem',   // 4px * 0.9 = 3.6px
        '1.5': '0.338rem', // 6px * 0.9 = 5.4px
        '2': '0.45rem',    // 8px * 0.9 = 7.2px
        '2.5': '0.563rem', // 10px * 0.9 = 9px
        '3': '0.675rem',   // 12px * 0.9 = 10.8px
        '3.5': '0.788rem', // 14px * 0.9 = 12.6px
        '4': '0.9rem',     // 16px * 0.9 = 14.4px
        '5': '1.125rem',   // 20px * 0.9 = 18px
        '6': '1.35rem',    // 24px * 0.9 = 21.6px
        '7': '1.575rem',   // 28px * 0.9 = 25.2px
        '8': '1.8rem',     // 32px * 0.9 = 28.8px
        '9': '2.025rem',   // 36px * 0.9 = 32.4px
        '10': '2.25rem',   // 40px * 0.9 = 36px
        '11': '2.475rem',  // 44px * 0.9 = 39.6px
        '12': '2.7rem',    // 48px * 0.9 = 43.2px
        '14': '3.15rem',   // 56px * 0.9 = 50.4px
        '16': '3.6rem',    // 64px * 0.9 = 57.6px
        '20': '4.5rem',    // 80px * 0.9 = 72px
        '24': '5.4rem',    // 96px * 0.9 = 86.4px
        '28': '6.3rem',    // 112px * 0.9 = 100.8px
        '32': '7.2rem',    // 128px * 0.9 = 115.2px
        '36': '8.1rem',    // 144px * 0.9 = 129.6px
        '40': '9rem',      // 160px * 0.9 = 144px
        '44': '9.9rem',    // 176px * 0.9 = 158.4px
        '48': '10.8rem',   // 192px * 0.9 = 172.8px
        '52': '11.7rem',   // 208px * 0.9 = 187.2px
        '56': '12.6rem',   // 224px * 0.9 = 201.6px
        '60': '13.5rem',   // 240px * 0.9 = 216px
        '64': '14.4rem',   // 256px * 0.9 = 230.4px
        '72': '16.2rem',   // 288px * 0.9 = 259.2px
        '80': '18rem',     // 320px * 0.9 = 288px
        '96': '21.6rem',   // 384px * 0.9 = 345.6px
      },
      fontSize: {
        'xs': ['0.675rem', { lineHeight: '0.9rem' }],      // 12px * 0.9 = 10.8px
        'sm': ['0.788rem', { lineHeight: '1.125rem' }],    // 14px * 0.9 = 12.6px
        'base': ['0.9rem', { lineHeight: '1.35rem' }],     // 16px * 0.9 = 14.4px
        'lg': ['1.013rem', { lineHeight: '1.575rem' }],    // 18px * 0.9 = 16.2px
        'xl': ['1.125rem', { lineHeight: '1.575rem' }],    // 20px * 0.9 = 18px
        '2xl': ['1.35rem', { lineHeight: '1.8rem' }],      // 24px * 0.9 = 21.6px
        '3xl': ['1.688rem', { lineHeight: '2.025rem' }],   // 30px * 0.9 = 27px
        '4xl': ['2.025rem', { lineHeight: '2.25rem' }],    // 36px * 0.9 = 32.4px
        '5xl': ['2.7rem', { lineHeight: '1' }],            // 48px * 0.9 = 43.2px
        '6xl': ['3.375rem', { lineHeight: '1' }],          // 60px * 0.9 = 54px
        '7xl': ['4.05rem', { lineHeight: '1' }],           // 72px * 0.9 = 64.8px
        '8xl': ['5.4rem', { lineHeight: '1' }],            // 96px * 0.9 = 86.4px
        '9xl': ['7.2rem', { lineHeight: '1' }],            // 128px * 0.9 = 115.2px
      },
      colors: {
        sidebar: {
          dark: '#0f172a',      // slate-900
          darker: '#1e293b',    // slate-800
          accent: '#3b82f6',    // blue-500
          'accent-hover': '#2563eb', // blue-600
          'text-primary': '#f8fafc',   // slate-50
          'text-secondary': '#94a3b8', // slate-400
          'border': '#334155',  // slate-700
        },
      },
      boxShadow: {
        'sidebar': '4px 0 24px -2px rgba(0, 0, 0, 0.3)',
        'sidebar-item': '0 2px 8px -2px rgba(0, 0, 0, 0.2)',
        'tooltip': '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'scale-in': 'scaleIn 0.15s ease-out',
        'indicator-slide': 'indicatorSlide 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        indicatorSlide: {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
      },
      transitionProperty: {
        'width': 'width',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
}

