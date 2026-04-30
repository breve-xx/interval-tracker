import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/js/**/*.js'],
      exclude: ['src/js/script.js', 'src/js/uiController.js'],
    },
  },
});
