import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
		fontFamily: {
				'playfair': ['Playfair Display', 'serif'],
				'cinzel': ['Cinzel', 'Playfair Display', 'serif'],
				'inter': ['Inter', 'sans-serif'],
			},
		colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				
				/* Cathédrale */
				cathedral: {
					navy: 'hsl(var(--cathedral-navy))',
					'navy-light': 'hsl(var(--cathedral-navy-light))',
					gold: 'hsl(var(--cathedral-gold))',
					'gold-light': 'hsl(var(--cathedral-gold-light))',
					'gold-dark': 'hsl(var(--cathedral-gold-dark, 43 70% 38%))',
					burgundy: 'hsl(var(--cathedral-burgundy, 350 55% 35%))',
					'burgundy-light': 'hsl(var(--cathedral-burgundy-light, 350 45% 55%))',
				},
				stained: {
					blue: 'hsl(var(--stained-blue, 220 75% 55%))',
					ruby: 'hsl(var(--stained-ruby, 350 65% 45%))',
					emerald: 'hsl(var(--stained-emerald, 155 55% 38%))',
					amber: 'hsl(var(--stained-amber, 38 85% 55%))',
				},
				
				/* Couleurs spirituelles */
				'sky-blue': {
					DEFAULT: 'hsl(var(--sky-blue))',
					deep: 'hsl(var(--sky-blue-deep))',
					dark: 'hsl(var(--sky-blue-dark))'
				},
				'life-green': {
					DEFAULT: 'hsl(var(--life-green))',
					deep: 'hsl(var(--life-green-deep))',
					dark: 'hsl(var(--life-green-dark))'
				},
				'divine-gold': {
					DEFAULT: 'hsl(var(--divine-gold))',
					deep: 'hsl(var(--divine-gold-deep))'
				},
				'sacred-purple': 'hsl(var(--sacred-purple))',
				
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					light: 'hsl(var(--secondary-light, 220 40% 40%))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					light: 'hsl(var(--accent-light, 350 40% 65%))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					soft: 'hsl(var(--card-soft, 40 20% 98%))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0', opacity: '0' },
					to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
					to: { height: '0', opacity: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'slide-in': {
					'0%': { transform: 'translateX(-100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
			'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px hsl(43 65% 52% / 0.3)' },
					'50%': { boxShadow: '0 0 40px hsl(43 65% 52% / 0.6)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-1000px 0' },
					'100%': { backgroundPosition: '1000px 0' }
				},
				'golden-glow': {
					'0%, 100%': { opacity: '0.4', filter: 'blur(40px)' },
					'50%': { opacity: '0.7', filter: 'blur(60px)' }
				},
				'reveal-up': {
					'0%': { opacity: '0', transform: 'translateY(40px) scale(0.98)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.3s ease-out',
				'accordion-up': 'accordion-up 0.3s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'fade-in-up': 'fade-in-up 0.8s ease-out',
				'scale-in': 'scale-in 0.3s ease-out',
				'slide-in': 'slide-in 0.4s ease-out',
				'slide-in-right': 'slide-in-right 0.4s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'shimmer': 'shimmer 2s linear infinite',
				'golden-glow': 'golden-glow 4s ease-in-out infinite',
				'reveal-up': 'reveal-up 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards'
			},
			boxShadow: {
				'elegant': '0 10px 30px -10px hsl(43 65% 52% / 0.25)',
				'subtle': '0 4px 20px -8px hsl(220 50% 8% / 0.12)',
				'glow': '0 0 40px hsl(43 65% 52% / 0.35)',
				'divine': '0 15px 40px -15px hsl(43 65% 52% / 0.4)',
				'cathedral': '0 20px 60px -20px hsl(220 55% 12% / 0.3)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
