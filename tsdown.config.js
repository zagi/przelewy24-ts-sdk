// @ts-check
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/webhooks.ts', 'src/types.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2022',
  platform: 'neutral',
  deps: { neverBundle: ['node:crypto'] },
  sourcemap: true,
});
