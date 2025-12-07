import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['electron/**/*.js'],
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
    include: ['tests/**/*.test.js'],
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
