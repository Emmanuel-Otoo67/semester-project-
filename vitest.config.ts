import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/ui/testSetup.ts'],
    pool: 'threads',
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 15000,
  },
});
