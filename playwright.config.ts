import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0, reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } }
  ],
  webServer: {
    command: 'npm run build --workspace @fin/web && npm run preview --workspace @fin/web -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
      VITE_FIREBASE_PROJECT_ID: 'demo-finanzas-tests',
      VITE_FIREBASE_API_KEY: 'demo-public-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-finanzas-tests.firebaseapp.com',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:demo',
      VITE_FIREBASE_AUTH_EMULATOR_PORT: '9109',
      VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '8180'
    }
  }
});
