import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

const channel = process.env.RH_CHANNEL || 'stable';

export default defineConfig({
  base: '/rhythmos/',
  server: { host: true },
  preview: { host: true },
  plugins: [basicSsl()],
  build: { outDir: channel === 'dev' ? 'dist/dev' : 'dist' },
  define: {
    __RH_CHANNEL__: JSON.stringify(channel)
  }
});
