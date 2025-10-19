import { defineConfig } from 'vite';
import path from 'path';
import builtins from 'builtin-modules';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'main.ts'),
      name: 'ObsiCard',
      fileName: () => 'main.js',
      formats: ['cjs']
    },
    outDir: '.',
    emptyOutDir: false,
    target: 'es2020',
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [
        'obsidian',
        'electron',
        '@codemirror/autocomplete',
        '@codemirror/collab',
        '@codemirror/commands',
        '@codemirror/language',
        '@codemirror/lint',
        '@codemirror/search',
        '@codemirror/state',
        '@codemirror/view',
        '@lezer/common',
        '@lezer/highlight',
        '@lezer/lr',
        ...builtins
      ],
      output: {
        entryFileNames: 'main.js',
        format: 'cjs',
        exports: 'default'
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.ts']
    }
  }
});

