/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				felt: {
					900: '#0d2b1a',
					800: '#143d25',
					700: '#1a5230',
				}
			}
		}
	},
	plugins: []
};
