/// <reference types='vitest' />
import { angular } from '@nitedani/vite-plugin-angular/plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { vavite } from 'vavite';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
// import { cjsInterop } from 'vite-plugin-cjs-interop';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/apps/badman',
  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{js,mjs,ts,mts,cts,jsx,tsx}'],

    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/badman',
      provider: 'v8',
    },
  },
  publicDir: 'src/public',
  build: {
    outDir: '../../dist/apps/badman',
  },
  ssr: {},
  plugins: [
    angular({
      swc: true,
    }),
    // cjsInterop({
    //   dependencies: ['@apollo/client/core'],
    // }),
    vavite({
      serverEntry: './src/server/main.ts',
      serveClientAssetsInDev: true,
      useViteRuntime: true,
    }),
    nxViteTsPaths(),
    splitVendorChunkPlugin(),
  ],
  server: {
    port: 5200,
    fs: {
      allow: [
        'src/',
        '../../node_modules/@fontsource/roboto/files/',
        '../../node_modules/material-icons/iconfont/',
      ],
    },
  },
});
