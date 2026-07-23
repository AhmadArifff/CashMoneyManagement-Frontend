/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,html}',
    './public/**/*.html',
  ],
  safelist: [
    // Layout & Flex
    'flex', 'flex-col', 'flex-wrap', 'flex-1', 'items-center', 'justify-center',
    'justify-between', 'justify-end', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5',
    'gap-3', 'gap-4', 'hidden', 'block', 'inline', 'inline-flex', 'grid',
    'shrink-0', 'min-w-0', 'overflow-hidden', 'overflow-y-auto', 'overflow-x-auto',
    'relative', 'absolute', 'fixed', 'inset-0', 'sticky', 'top-0', 'right-0',
    'ml-auto', 'mt-auto', 'space-y-1', 'space-y-1.5', 'space-y-2', 'space-y-3',
    'space-y-4', 'space-y-5', 'whitespace-nowrap', 'truncate',
    // Sizing
    'w-full', 'w-4', 'w-5', 'w-6', 'w-8', 'w-9', 'w-10', 'w-12', 'w-16', 'w-24',
    'w-32', 'w-40', 'w-48', 'w-60', 'w-72', 'w-80',
    'h-4', 'h-5', 'h-6', 'h-8', 'h-9', 'h-10', 'h-12', 'h-16', 'h-24', 'h-64',
    'min-h-screen', 'max-h-[70vh]', 'max-w-[88vw]',
    // Padding & Margin
    'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'px-1', 'px-1.5', 'px-2', 'px-3', 'px-3.5',
    'px-4', 'px-6', 'py-0.5', 'py-1', 'py-1.5', 'py-2', 'py-2.5', 'py-3', 'py-4',
    'py-5', 'pb-1', 'pb-2', 'pb-8', 'pb-28', 'pt-4', '-mt-0.5', '-mt-1',
    'mt-1', 'mt-2', 'mt-3', 'mb-2', 'mb-3', 'mb-4',
    // Colors - Background
    'bg-white', 'bg-paper', 'bg-surface', 'bg-teal-50', 'bg-teal-100', 'bg-teal-200',
    'bg-teal-600', 'bg-teal-700', 'bg-teal-800', 'bg-teal-900',
    'bg-rust-50', 'bg-rust-100', 'bg-rust-500', 'bg-rust-600',
    'bg-amber-50', 'bg-amber-100', 'bg-amber-200', 'bg-amber-600',
    'bg-line', 'bg-white/20',
    // Colors - Text
    'text-white', 'text-ink', 'text-inksoft', 'text-teal-100', 'text-teal-600',
    'text-teal-700', 'text-teal-800', 'text-rust-600', 'text-rust-700',
    'text-amber-600', 'text-amber-700',
    // Colors - Border
    'border', 'border-b', 'border-t', 'border-r', 'border-l',
    'border-line', 'border-teal-200', 'border-teal-400', 'border-teal-700',
    'border-rust-200', 'border-amber-200', 'border-amber-400',
    // Hover states
    'hover:bg-teal-50', 'hover:bg-teal-700', 'hover:bg-teal-800',
    'hover:border-teal-400', 'hover:border-amber-400',
    // Typography
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
    'text-[10px]', 'text-[11px]', 'text-[12px]', 'text-[12.5px]', 'text-[13px]',
    'text-[13.5px]', 'text-[14px]', 'text-[15px]', 'text-[16px]',
    'font-medium', 'font-semibold', 'font-bold', 'font-display', 'font-mono',
    'leading-tight', 'leading-relaxed', 'leading-snug', 'underline',
    // Border Radius
    'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
    // Shadows
    'shadow-card', 'shadow-lg',
    // Z-index
    'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-[100]',
    // Animation
    'animate-spin', 'transition', 'cursor-pointer',
    // Backdrop
    'backdrop-blur',
    // Grid
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4',
    'col-span-2', 'col-span-3',
    // Negative margin/position
    '-top-1', '-right-1',
    // Responsive
    'md:flex', 'md:hidden', 'md:block', 'md:px-6', 'md:pb-8', 'md:p-5',
    'sm:block', 'sm:inline', 'sm:flex',
    'lg:col-span-2', 'lg:col-span-3', 'lg:grid-cols-3', 'lg:grid-cols-4',
    // Miscellaneous
    'opacity-0', 'opacity-50', 'opacity-100', 'pointer-events-none',
    'border-dashed', 'cursor-not-allowed',
    // Positive values for top-
    'top-[calc(100%+8px)]',
    // min-w
    'min-w-[18px]',
    // Modal backdrop
    'modal-backdrop', 'view', 'active',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#101A17',
        inksoft: '#4B5A55',
        paper: '#F4F7F5',
        surface: '#FFFFFF',
        line: '#E3E9E5',
        teal: {
          50: '#EEF7F4',
          100: '#D7ECE4',
          200: '#AEDACB',
          300: '#7EC2AC',
          400: '#4FA88E',
          500: '#2E8B72',
          600: '#1F6F5C',
          700: '#16594A',
          800: '#124A3E',
          900: '#0E3B32'
        },
        rust: {
          50: '#FBEEE9',
          100: '#F5D3C4',
          200: '#EBA98A',
          300: '#DE7D55',
          400: '#CE5A32',
          500: '#B8471F',
          600: '#973A19',
          700: '#742C13'
        },
        amber: {
          50: '#FFF8E8',
          100: '#FCE9BB',
          200: '#F7D791',
          300: '#F4C563',
          400: '#EDAE34',
          500: '#DE9518',
          600: '#B87511'
        }
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,26,23,0.04), 0 8px 24px -12px rgba(16,26,23,0.12)',
      }
    }
  },
  plugins: [],
};
