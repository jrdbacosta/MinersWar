import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000
  },
  resolve: {
    alias: mode === 'test' ? {
      'ethers': path.resolve(__dirname, 'src/test-mocks/ethers.js')
    } : {}
  },
  ssr: {
    noExternal: ['ethers']
  }
}));
