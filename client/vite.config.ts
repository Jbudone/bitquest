import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'index.html',
        tools: 'tools.html',
        animator: 'animator.html',
        vfx: 'vfx.html',
        render_map: 'render_map.html'
      }
    }
  }
});
