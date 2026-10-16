import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['tests/setup.test.ts', 'tests/{contracts,domain,data,workers,ai}/**/*.test.ts', 'packages/**/*.test.ts'], exclude: ['**/node_modules/**', '**/dist/**', 'tests/rules/**', 'tests/e2e/**'] } },
      { test: { name: 'web', environment: 'jsdom', include: ['tests/ui/**/*.test.{ts,tsx}', 'apps/web/src/**/*.test.{ts,tsx}'], exclude: ['**/node_modules/**', '**/dist/**'], setupFiles: ['tests/setup-dom.ts'] } }
    ]
  }
});
