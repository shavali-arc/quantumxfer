import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['electron/**/*.js', 'src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'dist-electron/'
      ],
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    include: ['tests/**/*.test.{js,ts,tsx}'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron')
    }
  }
});
