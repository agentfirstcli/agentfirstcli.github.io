import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://agentfirstcli.github.io',
  vite: {
    plugins: [tailwindcss()],
  },
});
