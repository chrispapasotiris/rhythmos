import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/rhythmos/',
  server: { host: true },
  preview: { host: true },
  plugins: [basicSsl()],
  build: { outDir: 'dist' }
});
