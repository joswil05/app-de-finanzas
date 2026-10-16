import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// T19/T22 will integrate Workbox and FCM in one service worker.
// Installing vite-plugin-pwa does not certify offline availability.
export default defineConfig({ envDir: '../..', plugins: [react()], build: { target: 'es2022' } });
