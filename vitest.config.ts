import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Keep local clean-checkout verification directories out of test discovery.
    include: ['tests/**/*.test.ts'],
  },
});
