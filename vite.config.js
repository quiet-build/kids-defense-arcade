import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  preview: { cors: true },
  build: { target: 'es2022', rollupOptions: {
    input: { main: 'index.html', component: 'src/component.js' },
    output: { entryFileNames: chunk => chunk.name === 'component' ? 'component.js' : 'assets/[name]-[hash].js' }
  } }
});
