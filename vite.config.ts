import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    outDir: 'lib',
    lib: {
      entry: 'src/ssignal.ts',
      name: 'SSignal',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `ssignal.${format}.js`,
    },
    rollupOptions: {
      external: [],
      output: {
        exports: 'named',
      }
    },
    target: 'es2018',
  },
  plugins: [dts()],
});
