import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2019',
    outDir: 'dist',
    splitting: false,
    minify: false,
    esbuildOptions(options) {
        options.outbase = './src';
    },
});
