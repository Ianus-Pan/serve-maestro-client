import defaultTheme from 'tailwindcss/defaultTheme';
import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // Enable class-based dark mode
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                cl_background: {
                    50: {
                        DEFAULT: 'rgba(227, 227, 227, .5)',
                        dark: 'rgba(211, 211, 211, .5)',
                    },
                    100: {
                        DEFAULT: '#E3E3E3',
                        dark: '#d3d3d3',
                    },
                    300: {
                        DEFAULT: '#cccccc',
                        dark: '#b0b0b0',
                    },
                    400: {
                        DEFAULT: '#BEBEBE',
                        dark: '#a1a1a1',
                    },
                    800: {
                        DEFAULT: '#939393',
                        dark: '#787878'
                    }
                },
                cl_accent: {
                    50: {
                        DEFAULT: 'rgb(70,84,107,.5)',
                    },
                    100: {
                        DEFAULT: '#5D6895',
                    },
                    400: {
                        DEFAULT: '#46546B',
                    },
                    500: {
                        DEFAULT: '#29467d',
                    },
                    800: {
                        DEFAULT: '#2f405c',
                    }
                }
            },
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [
        forms, 
        typography,
        require('tailwind-scrollbar-hide')
    ],
};
