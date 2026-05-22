/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'react-vendor';
          if (id.includes('/antd/') || id.includes('/@ant-design/icons/')) return 'antd-vendor';
          if (id.includes('/@ant-design/charts/') || id.includes('/@antv/')) return 'charts-vendor';
          if (id.includes('/firebase/')) return 'firebase-vendor';
          if (id.includes('/xlsx/')) return 'xlsx-vendor';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
